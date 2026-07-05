from pathlib import Path
p = Path('app.py')
print('PATH', p.resolve())
print('EXISTS', p.exists())
print('SIZE', p.stat().st_size if p.exists() else 'N/A')
print('MTIME', p.stat().st_mtime if p.exists() else 'N/A')
text = p.read_text(encoding='utf-8')
print('FIRST LINE:', repr(text.splitlines()[0] if text else ''))
print('IMPORT CHECK')
import importlib, sys
if 'app' in sys.modules:
    del sys.modules['app']
mod = importlib.import_module('app')
print('MODULE FILE', mod.__file__)
print('ROUTES', sorted(mod.app.view_functions.keys()))
print('HAS ADMIN', 'admin_dashboard' in mod.app.view_functions)
print('HAS INJECT', hasattr(mod, 'inject_csrf_token'))
print('GLOBAL ADMIN', 'admin_dashboard' in mod.__dict__)
print('ROUTE COUNT', len(mod.app.view_functions))
