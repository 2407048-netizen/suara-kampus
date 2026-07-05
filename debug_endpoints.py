import importlib
import pathlib

path = pathlib.Path('app.py').resolve()
print('SOURCE_FILE:', path)
print('SOURCE_EXISTS:', path.exists())
print('--- SOURCE CHECK ---')
source = path.read_text(encoding='utf-8').splitlines()
for i, line in enumerate(source[:80], 1):
    print(f'{i:03}: {line}')

print('--- MODULE IMPORT ---')
mod = importlib.import_module('app')
print('MODULE FILE:', getattr(mod, '__file__', None))
print('MODULE NAME:', mod.__name__)
print('HAS INJECT:', hasattr(mod, 'inject_csrf_token'))
print('HAS CSRF IN CONTEXT PROCESSOR:', 'csrf_token' in mod.__dict__)
print('VIEW FUNCTIONS:', sorted(mod.app.view_functions.keys()))
print('ADMIN DASHBOARD PRESENT:', 'admin_dashboard' in mod.app.view_functions)
print('URL RULES:')
for rule in mod.app.url_map.iter_rules():
    print(rule.endpoint, rule.rule)
