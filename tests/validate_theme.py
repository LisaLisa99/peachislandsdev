"""Structural checks beyond Theme Check: editor schemas, references, and asset integrity."""
from pathlib import Path
import hashlib
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


def schema(path):
    return json.loads(re.search(r'{% schema %}(.*?){% endschema %}', path.read_text(), re.S).group(1))


class ThemeStructure(unittest.TestCase):
    def test_required_shopify_entry_files_at_repository_root(self):
        for relative in ['layout/theme.liquid', 'config/settings_schema.json', 'templates/index.json']:
            self.assertTrue((ROOT / relative).is_file(), relative)
        layout = (ROOT / 'layout/theme.liquid').read_text()
        self.assertIn('{{ content_for_header }}', layout)
        self.assertIn('{{ content_for_layout }}', layout)
        settings = json.loads((ROOT / 'config/settings_schema.json').read_text())
        self.assertIsInstance(settings, list)
        self.assertEqual(settings[0]['name'], 'theme_info')
        self.assertEqual(settings[0]['theme_version'], '1.0.2')

    def test_homepage_template_resolves_to_real_sections(self):
        homepage = json.loads((ROOT / 'templates/index.json').read_text())
        self.assertEqual(homepage['layout'], 'theme')
        self.assertTrue((ROOT / 'layout/theme.liquid').is_file())
        self.assertFalse((ROOT / 'templates/index.liquid').exists())
        self.assertEqual(homepage['sections']['hero']['type'], 'peach-split-hero')
        self.assertNotIn('main-404', [s['type'] for s in homepage['sections'].values()])
        not_found = json.loads((ROOT / 'templates/404.json').read_text())
        self.assertEqual(not_found['sections']['main']['type'], 'main-404')

    def test_font_defaults_and_image_selector_import_contract(self):
        settings = json.loads((ROOT / 'config/settings_schema.json').read_text())
        fields = {s['id']: s for g in settings for s in g.get('settings', []) if 'id' in s}
        self.assertEqual(fields['heading_font']['default'], 'assistant_n4')
        self.assertTrue(fields['use_original_heading_font']['default'])
        for name in ['peach-split-hero', 'peach-image-cards', 'peach-editorial']:
            spec = schema(ROOT / 'sections' / (name + '.liquid'))
            for block in spec['blocks']:
                for field in block['settings']:
                    if field['id'] == 'original_image':
                        self.assertLessEqual(len(field['options']), 25)
                        for option in field['options']:
                            self.assertLessEqual(len(option['value']), 20)
                            self.assertTrue(option['value'] == 'none' or option['value'].startswith('image_'))
        fonts = (ROOT / 'snippets/header-fonts.liquid').read_text()
        self.assertIn('Peach Islands Cormorant Garamond', fonts)
        for weight in [400, 600, 700]:
            self.assertTrue((ROOT / 'assets' / f'cormorant-garamond-latin-{weight}-normal.woff2').is_file())

    def test_editor_ranges_and_defaults(self):
        schemas = [schema(p) for p in (ROOT / 'sections').glob('*.liquid')]
        schemas += json.loads((ROOT / 'config/settings_schema.json').read_text())
        for group in schemas:
            settings = group.get('settings', []) + [s for b in group.get('blocks', []) for s in b.get('settings', [])]
            for s in settings:
                if s['type'] == 'range':
                    with self.subTest(section=group['name'], setting=s['id']):
                        self.assertLessEqual((s['max'] - s['min']) / s['step'], 100)
                        self.assertTrue(s['min'] <= s['default'] <= s['max'])
                        self.assertEqual((s['default'] - s['min']) % s['step'], 0)

    def test_json_template_settings_and_block_references(self):
        for path in list((ROOT / 'templates').glob('*.json')) + list((ROOT / 'sections').glob('*-group.json')):
            template = json.loads(path.read_text())
            self.assertEqual(set(template['order']), set(template['sections']))
            for instance in template['sections'].values():
                spec = schema(ROOT / 'sections' / (instance['type'] + '.liquid'))
                self.check_settings(instance.get('settings', {}), spec['settings'])
                self.assertEqual(set(instance.get('block_order', [])), set(instance.get('blocks', {})))
                for block in instance.get('blocks', {}).values():
                    block_schema = next(b for b in spec['blocks'] if b['type'] == block['type'])
                    self.check_settings(block.get('settings', {}), block_schema['settings'])

    def check_settings(self, values, definitions):
        fields = {s['id']: s for s in definitions if 'id' in s}
        for key, value in values.items():
            self.assertIn(key, fields)
            field = fields[key]
            if field['type'] == 'range':
                self.assertTrue(field['min'] <= value <= field['max'], (key, value))
                self.assertEqual((value - field['min']) % field['step'], 0, (key, value))
            if field['type'] == 'select':
                self.assertIn(value, [option['value'] for option in field['options']])

    def test_original_images_are_byte_identical(self):
        manifest = json.loads((ROOT / 'docs/source-assets.json').read_text())
        self.assertEqual(len(manifest), 55)
        for image in manifest:
            with self.subTest(image=image['file']):
                self.assertEqual(hashlib.sha256((ROOT / 'assets' / image['file']).read_bytes()).hexdigest(), image['sha256'])

    def test_home_sections_are_reusable(self):
        home = json.loads((ROOT / 'templates/index.json').read_text())
        for instance in home['sections'].values():
            self.assertTrue(schema(ROOT / 'sections' / (instance['type'] + '.liquid')).get('presets'))
        self.assertEqual(sum(s['type'] == 'peach-image-cards' for s in home['sections'].values()), 3)

    def test_no_nicepage_runtime_or_static_cart_controls(self):
        source = '\n'.join(p.read_text() for folder in ['layout', 'sections', 'snippets'] for p in (ROOT / folder).glob('*.liquid'))
        for value in ['nicepage.js', 'jquery.js', 'forms.nicepagesrv.com', 'nicepage.com/joomla', 'quanity1.png', 'HI, LISA']:
            self.assertFalse(value in source, value)
        self.assertIn("{% form 'product'", source)
        self.assertIn('name="updates[]"', source)
        self.assertIn("{% form 'customer'", source)


if __name__ == '__main__':
    unittest.main(verbosity=2)
