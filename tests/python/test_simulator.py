"""Independent oracle checks against the actual TypeScript engine, using stdlib only.

This checks internal model consistency, not equivalence to the desktop simulator
or validation of published experiments. Seeded cases are reproducible.
"""
import copy
import json
import os
from pathlib import Path
import random
import subprocess
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
DELTAS = {'N': (0, -1), 'S': (0, 1), 'E': (1, 0), 'W': (-1, 0)}


def normalized(groups):
    return sorted(sorted((t['x'], t['y'], t.get('typeId', '')) for t in group) for group in groups)


def oracle(config, commands):
    """Find the greatest simultaneously movable set by pruning blocked groups.

    Bonds are graph connected components of adjacent permitted type pairs.
    The oracle does not import or translate TypeScript source.
    """
    groups = [[copy.deepcopy(t)] for t in config['tiles'] if not t['isConcrete']]
    walls = {(t['x'], t['y']) for t in config['tiles'] if t['isConcrete']}
    rules = {frozenset(pair) for pair in config['stickingRules']}

    def bond():
        nonlocal groups
        parent = list(range(len(groups)))
        def find(i):
            while parent[i] != i:
                i = parent[i]
            return i
        for i, left in enumerate(groups):
            for j in range(i):
                if any(abs(a['x'] - b['x']) + abs(a['y'] - b['y']) == 1
                       and frozenset((a['typeId'], b['typeId'])) in rules
                       for a in left for b in groups[j]):
                    parent[find(i)] = find(j)
        components = {}
        for i, group in enumerate(groups):
            components.setdefault(find(i), []).extend(group)
        groups = list(components.values())

    bond()
    snapshots = [normalized(groups)]
    for command in commands:
        dx, dy = DELTAS[command]
        for _ in range(config['cols'] + config['rows']):
            occupied = {(t['x'], t['y']): i for i, g in enumerate(groups) for t in g}
            movable = set(range(len(groups)))
            while True:
                remove = set()
                for i in movable:
                    for tile in groups[i]:
                        dest = tile['x'] + dx, tile['y'] + dy
                        if (not (0 <= dest[0] < config['cols'] and 0 <= dest[1] < config['rows'])
                                or dest in walls or (dest in occupied and occupied[dest] not in movable)):
                            remove.add(i)
                if not remove:
                    break
                movable -= remove
            if not movable:
                break
            for i in movable:
                for tile in groups[i]:
                    tile['x'] += dx
                    tile['y'] += dy
        else:
            raise AssertionError('A tumble did not terminate within the board extent')
        bond()
        snapshots.append(normalized(groups))
    return snapshots


def scenarios():
    rng = random.Random(20261028)
    result = []
    for _ in range(100):
        cols, rows = rng.randint(3, 12), rng.randint(3, 12)
        cells = rng.sample([(x, y) for x in range(cols) for y in range(rows)], rng.randint(2, cols * rows // 2))
        tiles = [{'x': x, 'y': y, 'isConcrete': rng.random() < .25,
                  'typeId': rng.choice(['a', 'b', 'c']), 'glues': ['', '', '', '']} for x, y in cells]
        rules = [[a, b] for i, a in enumerate('abc') for b in 'abc'[i:] if rng.random() < .4]
        result.append({'config': {'cols': cols, 'rows': rows, 'tiles': tiles, 'glueFunction': {'zero': 0, 'strong&glue': 3},
                                 'robotTypes': [{'id': t, 'label': t + ' & <robot>', 'color': '#224466'} for t in 'abc'],
                                 'stickingRules': rules}, 'commands': [rng.choice(list(DELTAS)) for _ in range(12)]})
    return result


class EngineReferenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scenarios = scenarios()
        completed = subprocess.run([os.environ.get('NODE', 'node'), 'scripts/python-test-driver.mjs'],
                                   cwd=ROOT, input=json.dumps(cls.scenarios), text=True, capture_output=True, check=True)
        cls.actual = json.loads(completed.stdout)

    def test_100_boards_and_1200_commands_against_independent_oracle(self):
        for index, (scenario, actual) in enumerate(zip(self.scenarios, self.actual)):
            with self.subTest(board=index):
                expected = oracle(scenario['config'], scenario['commands'])
                snapshots = [sorted(sorted(tuple(tile) for tile in group) for group in frame) for frame in actual['snapshots']]
                self.assertEqual(snapshots, expected)

    def test_exports_are_valid_xml_and_preserve_rules_labels_and_strengths(self):
        for scenario, actual in zip(self.scenarios, self.actual):
            doc = ET.fromstring(actual['xml'])
            strengths = {f.find('Labels').attrib['L1']: float(f.findtext('Strength')) for f in doc.findall('./GlueFunction/Function')}
            self.assertEqual(strengths, scenario['config']['glueFunction'])
            rules = [[r.attrib['a'], r.attrib['b']] for r in doc.findall('./StickingRules/Sticking')]
            self.assertEqual(rules, scenario['config']['stickingRules'])
            self.assertEqual([t.attrib['label'] for t in doc.findall('./RobotTypes/RobotType')],
                             [t['label'] for t in scenario['config']['robotTypes']])
            locations = [(t.find('Location').attrib['x'], t.find('Location').attrib['y']) for t in doc.findall('./TileData/Tile')]
            self.assertEqual(len(locations), len(set(locations)))
            self.assertEqual(len(locations), len(scenario['config']['tiles']))


class PresetTests(unittest.TestCase):
    def test_gallery_metadata_matches_every_vendored_configuration(self):
        index = json.loads((ROOT / 'public/presets/index.json').read_text())
        for preset in index['presets']:
            with self.subTest(preset=preset['id']):
                source = ROOT / 'public/presets' / preset['file']
                doc = ET.parse(source)
                size = doc.find('BoardSize')
                self.assertEqual((int(size.attrib['width']), int(size.attrib['height'])), (preset['cols'], preset['rows']))
                tiles = doc.findall('./TileData/Tile')
                walls = sum(t.findtext('Concrete') == 'True' for t in tiles)
                self.assertEqual((len(tiles) - walls, walls), (preset['robots'], preset['walls']))
                self.assertEqual(source.stat().st_size, preset['bytes'])


if __name__ == '__main__':
    unittest.main()
