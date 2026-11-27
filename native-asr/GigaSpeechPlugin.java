package app.magnit.planner;

import android.os.Build;
import android.os.SystemClock;
import android.util.Base64;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.k2fsa.sherpa.onnx.*;
import java.io.*;
import java.net.*;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Local Russian ASR. Network is used only to fetch immutable public model files. */
@CapacitorPlugin(name="GigaSpeech")
public class GigaSpeechPlugin extends Plugin {
    static final int RATE=16000, MAX=300*RATE;
    static final String REV="c0acd38c8aeb2bdc04da221bd661ffcdb9645f7d";
    static final String URL_BASE="https://huggingface.co/Alexxerm/gigaam-v3-e2e-rnnt-sherpa-onnx/resolve/"+REV+"/";
    static final String[] NAMES={"encoder.int8.onnx","decoder.onnx","joiner.onnx","tokens.txt"};
    static final String[] HASH={"aa4e9bd1d8f1b30534c0b56d743970be53fd102dba639c2b1cc06e2aa898ada0","ea08443676485385c0dd31d938233bffaed6e52d47d84844c9b568589f1c9b27","ade116563dbf66e503b0994efab6b5861412743e52bf31c39fc3fffa3783d5d1",null};
    static final long[] LIMIT={240_000_000,2_000_000,1_000_000,30_000};
    private final ScheduledExecutorService worker=Executors.newSingleThreadScheduledExecutor();
    // Only accessed by the serial worker; never release a recognizer during decode.
    private OfflineRecognizer cachedRecognizer;
    private ScheduledFuture<?> idleRelease;
    private volatile boolean destroyed=false;
    private void releaseRecognizer(){if(cachedRecognizer!=null){OfflineRecognizer r=cachedRecognizer;cachedRecognizer=null;r.release();}}
    private synchronized void keepRecognizerBriefly(){if(idleRelease!=null)idleRelease.cancel(false);if(!destroyed&&cachedRecognizer!=null)idleRelease=worker.schedule(this::releaseRecognizer,90,TimeUnit.SECONDS);}
    private final AtomicBoolean busy=new AtomicBoolean(false);
    private volatile boolean cancelled=false;
    private volatile int progress=-1;
    private File model(){return new File(getContext().getNoBackupFilesDir(),"gigaam-v3-"+REV);}
    private boolean supported(){return Arrays.asList(Build.SUPPORTED_ABIS).contains("arm64-v8a");}
    private boolean ready(){File d=model();if(!new File(d,"ready").isFile())return false;for(String name:NAMES)if(new File(d,name).length()==0)return false;return true;}
    @PluginMethod public void status(PluginCall call){JSObject out=new JSObject();out.put("supported",supported());out.put("ready",ready());out.put("busy",busy.get());out.put("canRemove",true);out.put("hasFiles",model().isDirectory());out.put("progress",progress);call.resolve(out);}
    @PluginMethod public void cancel(PluginCall call){cancelled=true;call.resolve();}
    private synchronized void submit(PluginCall call,Work work){
        if(destroyed){call.reject("Распознавание завершено");return;}
        if(!supported()){call.reject("GigaAM пока доступен на Android ARM64");return;}
        if(!busy.compareAndSet(false,true)){call.reject("Распознавание или загрузка уже выполняется");return;}
        cancelled=false;worker.execute(()->{JSObject result=null;String error=null;try{if(idleRelease!=null)idleRelease.cancel(false);result=work.run();}catch(Exception|LinkageError e){error=e.getMessage()==null?e.getClass().getSimpleName():e.getMessage();}catch(OutOfMemoryError e){releaseRecognizer();error="Недостаточно оперативной памяти для GigaAM";}finally{keepRecognizerBriefly();busy.set(false);progress=-1;}if(error==null)call.resolve(result);else call.reject(error);});
    }
    interface Work { JSObject run() throws Exception; }
    private void check() throws InterruptedException {if(cancelled||Thread.currentThread().isInterrupted())throw new InterruptedException("Отменено");}
    private static String hex(byte[] data){StringBuilder s=new StringBuilder();for(byte b:data)s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return s.toString();}
    private boolean valid(File file,int i) throws Exception{
        if(!file.isFile()||file.length()==0||file.length()>LIMIT[i])return false;
        if(HASH[i]==null){try(BufferedReader r=new BufferedReader(new InputStreamReader(new FileInputStream(file),java.nio.charset.StandardCharsets.UTF_8))){int lines=0;String line;while((line=r.readLine())!=null){if(!line.matches(".+ [0-9]+"))return false;lines++;}return lines==1025;}}
        MessageDigest md=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(file)){byte[] buf=new byte[65536];int n;while((n=in.read(buf))!=-1){check();md.update(buf,0,n);}}return HASH[i].equals(hex(md.digest()));
    }
    @PluginMethod public void prepare(PluginCall call){submit(call,()->{
        if(ready())return new JSObject();releaseRecognizer();File dir=model();if(!dir.isDirectory()&&!dir.mkdirs())throw new IOException("Не удалось создать папку модели");
        if(dir.getUsableSpace()<250_000_000L)throw new IOException("Освободи не менее 250 МБ на телефоне");
        progress=0;new File(dir,"ready").delete();long total=226_500_000L,complete=0;
        for(int i=0;i<NAMES.length;i++){
            check();File target=new File(dir,NAMES[i]);if(valid(target,i)){complete+=target.length();continue;}File temp=new File(dir,NAMES[i]+".part");temp.delete();
            HttpURLConnection conn=(HttpURLConnection)new URL(URL_BASE+NAMES[i]+"?download=true").openConnection();conn.setConnectTimeout(20000);conn.setReadTimeout(30000);conn.setInstanceFollowRedirects(true);
            try{if(conn.getResponseCode()!=200)throw new IOException("Не удалось скачать модель (HTTP "+conn.getResponseCode()+")");long count=0;
                try(InputStream in=conn.getInputStream();OutputStream out=new BufferedOutputStream(new FileOutputStream(temp))){byte[] buf=new byte[65536];int n;while((n=in.read(buf))!=-1){check();count+=n;if(count>LIMIT[i])throw new IOException("Неожиданный размер модели");out.write(buf,0,n);progress=(int)Math.min(99,(complete+count)*100/total);}}
                if(!valid(temp,i))throw new IOException("Проверка файла модели не пройдена: "+NAMES[i]);if(target.exists()&&!target.delete())throw new IOException("Не удалось заменить файл");if(!temp.renameTo(target))throw new IOException("Не удалось сохранить файл модели");complete+=count;
            }finally{conn.disconnect();temp.delete();}
        }
        check();try(OutputStream out=new FileOutputStream(new File(dir,"ready"))){out.write(1);}progress=100;return new JSObject();
    });}
    /** Delete only the dedicated model directory, serialized with download/decode. */
    static void removeModelFiles(File dir) throws IOException {
        if(!dir.exists())return;
        File marker=new File(dir,"ready");if(marker.exists()&&!marker.delete())throw new IOException("Не удалось отключить модель");
        for(String name:NAMES){for(String suffix:new String[]{"", ".part"}){File f=new File(dir,name+suffix);if(f.exists()&&!f.delete())throw new IOException("Не удалось удалить файл модели");}}
        File[] rest=dir.listFiles();if(rest==null||rest.length!=0||!dir.delete())throw new IOException("Не удалось полностью очистить папку модели");
    }
    @PluginMethod public void remove(PluginCall call){submit(call,()->{
        releaseRecognizer();removeModelFiles(model());JSObject out=new JSObject();out.put("ready",ready());return out;
    });}
    @PluginMethod public void transcribe(PluginCall call){
        String encoded=call.getString("pcm");if(encoded==null||encoded.length()>((MAX*2L+2)/3)*4){call.reject("Слишком длинная запись");return;}
        submit(call,()->{if(!ready())throw new IOException("Сначала скачай модель");long started=SystemClock.elapsedRealtime();byte[] bytes=Base64.decode(encoded,Base64.DEFAULT);if(bytes.length==0||bytes.length%2!=0||bytes.length>MAX*2)throw new IOException("Неверный формат PCM");short[] samples=new short[bytes.length/2];for(int i=0;i<samples.length;i++)samples[i]=(short)((bytes[i*2]&255)|(bytes[i*2+1]<<8));check();JSObject out=new JSObject();JSObject timing=new JSObject();timing.put("pcmMs",SystemClock.elapsedRealtime()-started);out.put("text",recognize(samples,timing));timing.put("totalMs",SystemClock.elapsedRealtime()-started);out.put("timing",timing);return out;});
    }
    static int boundary(short[] samples,int start){int cap=Math.min(samples.length,start+25*RATE);if(cap==samples.length)return cap;int best=cap;long energy=Long.MAX_VALUE;for(int p=start+20*RATE;p<=cap;p+=RATE/10){long e=0;for(int k=p-RATE/20;k<p+RATE/20&&k<samples.length;k++){long x=samples[k];e+=x*x;}if(e<energy){energy=e;best=p;}}return best;}
    private OfflineRecognizer createRecognizer(){
        File m=model();OfflineTransducerModelConfig tr=new OfflineTransducerModelConfig();tr.setEncoder(new File(m,NAMES[0]).getAbsolutePath());tr.setDecoder(new File(m,NAMES[1]).getAbsolutePath());tr.setJoiner(new File(m,NAMES[2]).getAbsolutePath());
        OfflineModelConfig mc=new OfflineModelConfig();mc.setTransducer(tr);mc.setTokens(new File(m,NAMES[3]).getAbsolutePath());mc.setModelType("nemo_transducer");mc.setProvider("cpu");mc.setNumThreads(2);
        FeatureConfig fc=new FeatureConfig();fc.setSampleRate(RATE);fc.setFeatureDim(64);OfflineRecognizerConfig cfg=new OfflineRecognizerConfig();cfg.setFeatConfig(fc);cfg.setModelConfig(mc);cfg.setDecodingMethod("greedy_search");
        return new OfflineRecognizer(null,cfg);
    }
    private String recognize(short[] samples,JSObject timing)throws Exception{
        long started=SystemClock.elapsedRealtime();boolean warm=cachedRecognizer!=null;
        if(!warm)cachedRecognizer=createRecognizer();
        timing.put("warm",warm);timing.put("initMs",SystemClock.elapsedRealtime()-started);check();
        OfflineRecognizer rec=cachedRecognizer;long decodeStart=SystemClock.elapsedRealtime();StringBuilder result=new StringBuilder();try{for(int pos=0;pos<samples.length;){check();int end=boundary(samples,pos);float[] pcm=new float[end-pos];for(int j=0;j<pcm.length;j++)pcm[j]=samples[pos+j]/32768f;OfflineStream stream=rec.createStream();try{if(stream.getPtr()==0)throw new IOException("Не удалось создать поток GigaAM");stream.acceptWaveform(pcm,RATE);rec.decode(stream);check();String text=rec.getResult(stream).getText().trim();if(!text.isEmpty()){if(result.length()>0)result.append(' ');result.append(text);}}finally{stream.release();}pos=end;}timing.put("decodeMs",SystemClock.elapsedRealtime()-decodeStart);return result.toString();}catch(Exception|LinkageError e){if(!(e instanceof InterruptedException))releaseRecognizer();throw e;}
    }
    @Override protected synchronized void handleOnDestroy(){destroyed=true;cancelled=true;worker.execute(()->{if(idleRelease!=null)idleRelease.cancel(false);releaseRecognizer();});worker.shutdown();super.handleOnDestroy();}
}
