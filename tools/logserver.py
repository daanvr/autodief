#!/usr/bin/env python3
"""Kleine logserver voor Autodief-opnames.

Het spel stuurt elke paar seconden een batch events (JSON-lijst) naar
POST http://127.0.0.1:8643/log. Elke speelsessie komt in een eigen bestand:
autodief/recordings/<sessie-id>.jsonl (één event per regel).
"""
import http.server
import json
import os

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'recordings')
PORT = 8643


def safe(name):
    return ''.join(ch for ch in str(name) if ch.isalnum() or ch in '-_')[:80] or 'onbekend'


class Handler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(b'autodief logserver ok')

    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0) or 0)
        body = self.rfile.read(n)
        try:
            events = json.loads(body.decode('utf-8'))
            if not isinstance(events, list):
                events = [events]
        except Exception:
            self.send_response(400)
            self._cors()
            self.end_headers()
            return
        os.makedirs(DIR, exist_ok=True)
        per_session = {}
        for e in events:
            if isinstance(e, dict):
                per_session.setdefault(safe(e.get('s', 'onbekend')), []).append(e)
        for s, evs in per_session.items():
            with open(os.path.join(DIR, s + '.jsonl'), 'a', encoding='utf-8') as f:
                for e in evs:
                    f.write(json.dumps(e, ensure_ascii=False) + '\n')
        self.send_response(204)
        self._cors()
        self.end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    print(f'Autodief logserver op http://127.0.0.1:{PORT} -> {os.path.abspath(DIR)}')
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
