# Fecha um passo do ciclo I-03: python3 fechar_ciclo.py C01 "evidência"
import json,hashlib,datetime,shutil,sys
n,ev=sys.argv[1],sys.argv[2]; TS=datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H%MZ'); M='/mnt/project-files/maestro/'
F='/mnt/project-files/unificado/fila-I03.json'
for f in [M+'BLOCKCHAIN.txt',F]: shutil.copy(f,M+'audit/backups/'+f.split('/')[-1]+'.'+TS+'.bak')
d=json.load(open(F)); q=d['passos']; feitos=[x for x in q if x['status']=='feito']
ant=feitos[-1]['sha256_evidencia'] if feitos else q[0]['elo_anterior']
x=[x for x in q if x['n']==n][0]
x.update(status='feito',feito_em=TS,evidencia=ev,elo_ev_anterior=ant,sha256_evidencia=hashlib.sha256((ant+ev).encode()).hexdigest())
json.dump(d,open(F,'w'),ensure_ascii=False,indent=1)
b=open(M+'BLOCKCHAIN.txt').read(); last=[l for l in b.splitlines() if l.startswith('Current Hash:')][-1].split(': ')[1]
blk=f"--- BLOCO {n} (ciclo I-03) | {x['titulo']} ---\nStatus: COMPLETE\nPrompt sha256: {x['sha256_prompt'][:16]}…\nKPI: {x['kpi']}\nActual: {TS} — {ev}\nPrevious Hash: {last}\n"
h=hashlib.sha1(blk.encode()).hexdigest(); open(M+'BLOCKCHAIN.txt','w').write(b.rstrip('\n')+'\n\n'+blk+f'Current Hash: {h}\n')
open(M+f'STEP-{n}-REPORT.txt','w').write(f"STEP-{n}-REPORT — {x['titulo']} ({x['tema']})\nData: {TS} Status: COMPLETE\n\n1. Prompt: {x['prompt']}\n2. KPI: {x['kpi']}\n3. Evidência: {ev}\n")
open(M+'audit/ACTIONS_LOG.txt','a').write(f"{TS} | STEP-{n} | FECHAR | fila-I03, BLOCKCHAIN, relatório | audit/backups/*.{TS}.bak\n")
open('/mnt/project-files/instituto/cadeia-instituto.txt','a').write(f"{TS} I-03 {n} {x['titulo']} | sha256_evidencia {x['sha256_evidencia']}\n")
nf=sum(1 for y in q if y['status']=='feito'); print(TS,h,x['sha256_evidencia'],f'{nf}/{len(q)}')
