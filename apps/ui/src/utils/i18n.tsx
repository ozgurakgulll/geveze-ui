import { setupI18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import type { ReactNode } from 'react';

let i18n: ReturnType<typeof setupI18n>;

export const initializeI18n = async () => {
  i18n = setupI18n();
  // Catalogs are compiled separately in Lingui flow; keep runtime safe in dev/build.
  i18n.load('tr-TR', {});
  i18n.activate('tr-TR');

  return i18n;
};

export const getI18n = () => i18n;

export const I18nWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    {children}
  </I18nProvider>
);
