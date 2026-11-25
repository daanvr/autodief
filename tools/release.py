#!/usr/bin/env python3
"""Versies van Autodief beheren.

  python3 tools/release.py snapshot 1   zet git-tag v1 als speelbare map v1/ neer
  python3 tools/release.py stamp        zet ?v=<nr> achter alle scripts/css (tegen gemixte cache)
  python3 tools/release.py index        maakt versies/index.html uit versies/versions.json

Elke versie bewaart zijn voortgang onder een eigen sleutel (zie js/version.js),
dus een oude versie en de nieuwste zitten elkaar nooit in de weg.
"""
import html
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def p(*a):
    return os.path.join(ROOT, *a)


def versions():
    with open(p('versies', 'versions.json'), encoding='utf-8') as f:
        return json.load(f)


def current():
    return int(re.search(r'nr:\s*(\d+)', open(p('js', 'version.js'), encoding='utf-8').read()).group(1))


def snapshot(nr):
    nr = int(nr)
    data = subprocess.check_output(['git', 'archive', f'v{nr}', '--', 'index.html', 'css', 'js'], cwd=ROOT)
    dest = p(f'v{nr}')
    shutil.rmtree(dest, ignore_errors=True)
    os.makedirs(dest)
    with tarfile.open(fileobj=io.BytesIO(data)) as t:
        t.extractall(dest, filter='data')
    idx = os.path.join(dest, 'index.html')
    s = open(idx, encoding='utf-8').read()
    banner = (f'<div style="background:#16243e;color:#ffd21f;font:18px VT323,monospace;padding:6px 12px;text-align:center">'
              f'Je speelt de oude versie {nr}. <a style="color:#fff" href="../">Naar de nieuwste versie</a> · '
              f'<a style="color:#fff" href="../versies/">Alle versies</a></div>')
    assert s.count('</body>') == 1
    open(idx, 'w', encoding='utf-8').write(s.replace('</body>', banner + '\n</body>'))
    print(f'v{nr}/ gemaakt')


def stamp():
    nr = current()
    s = open(p('index.html'), encoding='utf-8').read()
    s = re.sub(r'((?:src|href)="(?:js|css)/[^"?]+)(?:\?v=[^"]*)?"', rf'\1?v={nr}"', s)
    open(p('index.html'), 'w', encoding='utf-8').write(s)
    print(f'index.html gestempeld met ?v={nr}')


def index():
    nr = current()
    rows = ''
    for v in versions():
        live = v['nr'] == nr
        href = '../' if live else f"../v{v['nr']}/"
        if not live:
            assert os.path.exists(p(f"v{v['nr']}", 'index.html')), f"v{v['nr']}/ ontbreekt, draai snapshot"
        issue = f' · <a href="https://github.com/daanvr/autodief/issues/{v["issue"]}">issue #{v["issue"]}</a>' if v['issue'] else ''
        rows += (f'<li><h2>Versie {v["nr"]}: {html.escape(v["titel"])}{" <em>nieuwste</em>" if live else ""}</h2>'
                 f'<p>{html.escape(v["wat"])}</p><p class="m">{v["datum"]}{issue}</p>'
                 f'<a class="btn" href="{href}">Speel versie {v["nr"]}</a></li>\n')
    open(p('versies', 'index.html'), 'w', encoding='utf-8').write(f'''<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Autodief: alle versies</title>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
<style>
body{{margin:0;background:#16243e;font:22px/1.3 VT323,monospace;color:#3a2410}}
main{{max-width:760px;margin:0 auto;min-height:100vh;background:#e2c290;padding:20px;box-sizing:border-box}}
h1{{font:18px 'Press Start 2P',monospace}} h2{{margin:0;font-size:26px}} h2 em{{font-style:normal;background:#3a8a2a;color:#fff;padding:0 6px;font-size:20px}}
ul{{list-style:none;padding:0}} li{{background:#f4e0b8;border:2px solid #7a4a20;padding:12px 14px;margin:0 0 12px}}
p{{margin:4px 0}} .m{{color:#6a4a2a;font-size:18px}} a{{color:#1f3fa0}}
.btn{{display:inline-block;margin-top:6px;background:#f8ead0;border:2px solid #7a4a20;padding:4px 12px;text-decoration:none;color:#3a2410}}
</style></head><body><main><h1>AUTODIEF</h1>
<p>Bevalt de nieuwste versie niet? Hier kun je elke oudere versie spelen. Elke versie heeft zijn eigen opgeslagen potje.</p>
<ul>
{rows}</ul></main></body></html>
''')
    print('versies/index.html gemaakt')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    {'snapshot': lambda: snapshot(sys.argv[2]), 'stamp': stamp, 'index': index}.get(cmd, lambda: print(__doc__))()
