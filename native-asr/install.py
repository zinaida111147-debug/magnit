"""Run after npx cap sync android. Adds only the GigaAM native bridge to generated app."""
import hashlib,re,shutil,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]; app=root/'android/app'; src=app/'src/main/java/app/magnit/planner'
activity=src/'MainActivity.java'; gradle=app/'build.gradle'; manifest=app/'src/main/AndroidManifest.xml'
assert activity.is_file() and gradle.is_file(), 'Run cap add/sync android first'
a=activity.read_text(); g=gradle.read_text(); m=manifest.read_text()
if 'registerPlugin(GigaSpeechPlugin.class)' not in a:
    a,n=re.subn(r'(public class MainActivity extends BridgeActivity\s*\{)',r'\1\n    @Override public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(GigaSpeechPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n',a,count=1);assert n==1,'Unexpected MainActivity template'
if 'android.permission.INTERNET' not in m:m=m.replace('</manifest>','    <uses-permission android:name="android.permission.INTERNET" />\n</manifest>')
lib=app/'libs/sherpa-onnx-1.12.28.aar';lib.parent.mkdir(parents=True,exist_ok=True)
sha='b948066872e698f2e37e3c936c303426e12c5b7f9280e24f18767ed2efa08f8a'
def digest(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
if not lib.exists() or digest(lib)!=sha:
    temp=lib.with_suffix('.part')
    try:
        with urllib.request.urlopen('https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.28/sherpa-onnx-1.12.28.aar',timeout=120) as response,temp.open('wb') as f:shutil.copyfileobj(response,f)
        assert digest(temp)==sha,'Unexpected sherpa-onnx AAR hash';temp.replace(lib)
    finally:temp.unlink(missing_ok=True)
# Capacitor's app template includes fileTree(dir: 'libs', include: ['*.jar']) only.
if 'implementation files("libs/sherpa-onnx-1.12.28.aar")' not in g:
    g+='\n// GigaAM native ASR (pinned Speech Lab 0.4 runtime)\ndependencies {\n    implementation files("libs/sherpa-onnx-1.12.28.aar")\n    implementation "org.jetbrains.kotlin:kotlin-stdlib:1.9.24"\n}\nandroid { packaging { jniLibs { pickFirsts += ["**/libc++_shared.so"] } } }\n'
activity.write_text(a);gradle.write_text(g);manifest.write_text(m);shutil.copy2(Path(__file__).with_name('GigaSpeechPlugin.java'),src/'GigaSpeechPlugin.java')
print('GigaSpeech registered, verified sherpa-onnx AAR attached')
