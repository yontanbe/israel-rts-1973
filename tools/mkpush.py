# Build /tmp/b64/push.py: bundles changed files (git diff vs last pushed tag) for Composio workbench commit.
import sys,subprocess,tarfile,io,base64,os
REPO=os.environ.get("REPO","israel-rts");msg=sys.argv[1];files=sys.argv[2:] or subprocess.check_output(['git','ls-files'],text=True).split()
files=[f for f in files if os.path.isfile(f) and not f.startswith(('old/','assets/1973/','shot-')) and f not in('assets/concept-sheet.png','assets/keyart-golan.png','sprites-sheet.png')]
bio=io.BytesIO();t=tarfile.open(fileobj=bio,mode='w:gz')
for p in files:t.add(p)
t.close();b=base64.b64encode(bio.getvalue()).decode()
open('/tmp/b64/push.py','w').write(f'''import base64,io,tarfile
t=tarfile.open(fileobj=io.BytesIO(base64.b64decode("{b}")),mode="r:gz")
ups=[{{"path":m.name,"content":base64.b64encode(t.extractfile(m).read()).decode(),"encoding":"base64"}} for m in t.getmembers() if m.isfile()]
r,e=run_composio_tool("GITHUB_COMMIT_MULTIPLE_FILES",{{"owner":"yontanbe","repo":{REPO!r},"branch":"main","message":{msg!r},"upserts":ups}})
print(len(ups),e,(r or {{}}).get("data",{{}}).get("commit_url"))
''');print(len(files),len(b))
