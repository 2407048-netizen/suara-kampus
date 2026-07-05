from pathlib import Path
import importlib.util

path = Path('app.py')
print('FILE', path.resolve())
text = path.read_text(encoding='utf-8')
print('HAS INJECT IN SOURCE:', 'inject_csrf_token' in text)
print('HAS CSRF IN SOURCE:', 'csrf_token' in text)
print('SOURCE SNIPPET 1-60:')
for i, line in enumerate(text.splitlines()[:80], start=1):
    print(f'{i}: {line}')

# load module without caching existing import
spec = importlib.util.spec_from_file_location('debug_app', path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
print('\nLOADED DEBUG MODULE FILE', getattr(mod, '__file__', None))
print('DEBUG MODULE HAS INJECT:', hasattr(mod, 'inject_csrf_token'))
print('DEBUG MODULE HAS CSRF GLOBALS:', any('csrf' in k.lower() for k in dir(mod)))
print('DEBUG MODULE KEYS:', [k for k in dir(mod) if 'csrf' in k.lower() or 'inject' in k.lower()][:50])
