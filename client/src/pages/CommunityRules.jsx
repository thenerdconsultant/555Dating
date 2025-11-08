import { useTranslation } from '../i18n/LanguageContext'

export default function CommunityRules() {
  const { t } = useTranslation()
  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('rules.title','Community Rules')}</h2>
      <p>{t('rules.intro','These guidelines keep 555Dating welcoming and safe for everyone.')}</p>
      <section>
        <h3>{t('rules.respect','Respect')}</h3>
        <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
          <li>{t('rules.respect1','Use kind, inclusive language. Racism, sexism, or hateful content leads to removal.')}</li>
          <li>{t('rules.respect2','Obtain consent before sharing private details, screenshots, or conversations.')}</li>
        </ul>
      </section>
      <section>
        <h3>{t('rules.safety','Safety')}</h3>
        <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
          <li>{t('rules.safety1','Never request banking info, passwords, or one-time codes from other members.')}</li>
          <li>{t('rules.safety2','Meet in public places when connecting offline and let a friend know your plans.')}</li>
          <li>{t('rules.safety3','Report suspicious behaviour so moderators can intervene quickly.')}</li>
        </ul>
      </section>
      <section>
        <h3>{t('rules.content','Content')}</h3>
        <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
          <li>{t('rules.content1','Upload only photos you own. Explicit or violent content is not allowed.')}</li>
          <li>{t('rules.content2','Profiles should reflect real people. Impersonation or fake accounts are removed.')}</li>
        </ul>
      </section>
      <section>
        <h3>{t('rules.enforcement','Enforcement')}</h3>
        <p>{t('rules.enforcementText','Moderators may warn, pause, or remove accounts that break these rules. Serious violations are escalated to the appropriate authorities if required.')}</p>
      </section>
    </div>
  )
}
