import { useTranslation } from '../i18n/LanguageContext'

export default function Tos() {
  const { t } = useTranslation()
  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('tos.title','Terms of Service')}</h2>
      <p>{t('tos.intro','Welcome to 555Dating! By creating an account or using the product you agree to the terms below.')}</p>
      <section>
        <h3>{t('tos.use','Using 555Dating')}</h3>
        <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
          <li>{t('tos.use1','You must be at least 18 years old to use the service.')}</li>
          <li>{t('tos.use2','You are responsible for the content you share and the accuracy of your profile.')}</li>
          <li>{t('tos.use3','Do not share your password or allow others to access your account.')}</li>
        </ul>
      </section>
      <section>
        <h3>{t('tos.behavior','Acceptable behaviour')}</h3>
        <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
          <li>{t('tos.behavior1','Treat other members with respect. Harassment or hate speech is not allowed.')}</li>
          <li>{t('tos.behavior2','No spam, scams, or solicitation of money or services.')}</li>
          <li>{t('tos.behavior3','Report suspicious activity to the moderation team immediately.')}</li>
        </ul>
      </section>
      <section>
        <h3>{t('tos.termination','Termination')}</h3>
        <p>{t('tos.terminationText','We may suspend or terminate accounts that violate these terms or harm the community. You can delete or pause your account at any time from settings.')}</p>
      </section>
      <section>
        <h3>{t('tos.contact','Questions')}</h3>
        <p>{t('tos.contactText','Need help? Contact support via the channels listed in the app or email support@555dating.com.')}</p>
      </section>
    </div>
  )
}
