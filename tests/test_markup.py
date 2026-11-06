from html.parser import HTMLParser
from pathlib import Path
import unittest

class Structure(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack=[]; self.parents={}
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if attrs.get('id'):
            self.parents[attrs['id']]=list(self.stack)
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:
            self.stack.append((tag,attrs.get('id'),attrs.get('class','')))
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0]==tag:
                self.stack=self.stack[:i]; break

class LayoutStructureTests(unittest.TestCase):
    def test_results_are_not_nested_in_flex_toolbar(self):
        root=Path(__file__).resolve().parents[1]/'penuri'
        for path in [root/'index.html',*root.glob('regions/**/index.html')]:
            parser=Structure();parser.feed(path.read_text())
            for identifier in ['results','more','coverage']:
                self.assertFalse(any('results-toolbar' in c or 'toolbar-actions' in c for _,_,c in parser.parents[identifier]),str(path))
            self.assertTrue(any('results-toolbar' in c for _,_,c in parser.parents['share']))
