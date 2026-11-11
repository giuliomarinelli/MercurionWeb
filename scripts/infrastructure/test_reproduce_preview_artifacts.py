"""Focused regression checks for the public documentation preparation helpers."""
import json
import unittest
from unittest.mock import patch

import reproduce_preview_artifacts as recipe


class RecipeTests(unittest.TestCase):
    def test_source_allowlist_excludes_environment_and_key_material(self):
        for name in ('MercurionWebNode/env/.env.development', 'MercurionWebNode/env/.env.example', 'MercurionWebNode/env/.ENV.production',
                     'MercurionWebNode/keys/http.pem', 'MercurionWebNg/a.pfx', '../package.json', '/package.json'):
            with self.subTest(name=name):
                self.assertFalse(recipe.web_file(name))
        for name in ('package-lock.json', 'MercurionWebNode/Dockerfile', 'MercurionWebNg/src/main.ts', 'packages/rest-contracts/package.json'):
            self.assertTrue(recipe.web_file(name))

    def test_wrong_or_unfinished_ci_never_certifies_inputs(self):
        for change in (dict(headSha='b' * 40), dict(status='in_progress'), dict(conclusion='failure')):
            value = dict(headSha='a' * 40, status='completed', conclusion='success', jobs=[], url='public') | change
            with patch.object(recipe.subprocess, 'check_output', return_value=json.dumps(value)), self.assertRaises(ValueError):
                recipe.ci('repository', 1, 'a' * 40)

    def test_successful_metadata_ci_is_not_a_full_build(self):
        value = dict(headSha='a' * 40, status='completed', conclusion='success',
                     jobs=[dict(name='Required gate', conclusion='success')], url='public')
        with patch.object(recipe.subprocess, 'check_output', return_value=json.dumps(value)), self.assertRaisesRegex(ValueError, 'Full Web CI'):
            recipe.ci('repository', 1, 'a' * 40, full_web=True)

    def test_invalid_revision_is_rejected_before_git(self):
        with patch.object(recipe, 'git') as git, self.assertRaises(ValueError):
            recipe.revision('HEAD')
        git.assert_not_called()


if __name__ == '__main__':
    unittest.main()
