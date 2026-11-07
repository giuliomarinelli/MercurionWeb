import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('acceptance', Path(__file__).with_name('accept-t21-delivery.py'))
acceptance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(acceptance)


class RollbackEvidenceTests(unittest.TestCase):
    def bundle(self):
        return {'components': {role: {'config_digest': 'a', 'model': {'files': {'weights.pt': 'w', 'thresholds.json': 't'}}}
                               for role in ['web-ng', 'web-node', 'tox21']}}

    def test_same_images_cannot_be_reported_as_replacement_and_rollback(self):
        with self.assertRaisesRegex(ValueError, 'distinct image sets'):
            acceptance.validate_pair(self.bundle(), self.bundle())

    def test_different_artifacts_with_same_model_can_exercise_rollback(self):
        previous = self.bundle()
        candidate = copy.deepcopy(previous)
        candidate['components']['web-node']['config_digest'] = 'b'
        acceptance.validate_pair(candidate, previous)

    def test_different_model_requires_a_separate_acceptance_scenario(self):
        previous = self.bundle()
        candidate = copy.deepcopy(previous)
        candidate['components']['web-node']['config_digest'] = 'b'
        candidate['components']['tox21']['model']['files']['weights.pt'] = 'other'
        with self.assertRaisesRegex(ValueError, 'same QA weights'):
            acceptance.validate_pair(candidate, previous)


if __name__ == '__main__':
    unittest.main()
