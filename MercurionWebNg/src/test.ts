import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

// Initialize the Angular testing environment.
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

// Explicitly import only the specs under the OnPush smoke suite to avoid loading unrelated tests.
import './app/components/common/classic-spinner/classic-spinner.component.spec';
import './app/components/common/skeleton-card-loader/skeleton-card-loader.component.spec';
import './app/components/support/ticket-card-skeleton/ticket-card-skeleton.component.spec';
import './app/components/molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component.spec';
import './app/components/search-overlay/search-result-skeleton-loader/search-result-skeleton-loader.component.spec';
import './app/components/molecule-detail/molecule-badge/molecule-badge.component.spec';
import './app/components/molecule-detail/molecule-cta-chembl/molecule-cta-chembl.component.spec';
import './app/components/molecule-detail/collection-card/collection-card.component.spec';
import './app/components/common/toast/toast.component.spec';
import './app/components/common/turnstile/turnstile.component.spec';
import './app/components/common/footer/footer.component.spec';
import './app/components/common/redirect-to-login-component/redirect-to-login.component.spec';
import './app/pages/forbidden-403-landing/forbidden-403-landing.page.component.spec';
import './app/pages/not-found-404-landing/not-found-404-landing.page.component.spec';
import './app/pages/sso/sso.page.component.spec';
import './app/pages/account-activate/account-activate.page.component.spec';

