"""Optional fixture regeneration: python -m pip install segno==1.6.6
Then: python tests/fixtures/generate.py. Not needed to run browser tests.
"""
from pathlib import Path
import segno

assert segno.__version__ == '1.6.6'
for name, payload in [
    ('independent-ascii', 'https://example.com/independent?source=segno&v=1'),
    ('independent-unicode', 'https://例子.測試/採訪?q=😀'),
]:
    segno.make(payload, error='m', mode='byte', encoding='utf-8',
               micro=False, boost_error=False).save(
                   Path(__file__).with_name(name + '.png'), scale=8, border=4)
