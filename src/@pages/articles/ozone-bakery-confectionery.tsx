import { TolgeeStaticDataProp, useTranslate } from '@tolgee/react'

import { Layout } from '@/widgets/layout'

import { getArticleBySlug } from '@/shared/config/articles-data'
import { getArticleNamespace, NAMESPACES } from '@/shared/config/tolgee'
import { useIsLangInRoute, useLang } from '@/shared/lib/lang'
import {
  ArticleContainer,
  ArticleContent,
  ArticleHero,
  ArticleSection,
  BulletList,
  DataTable,
  HighlightBox,
  Paragraph,
  SourcesList,
} from '@/shared/ui/article-components'
import { Seo } from '@/shared/ui/seo'

const SLUG = 'ozone-bakery-confectionery'
const ARTICLE_NS = getArticleNamespace(SLUG)

type Source = { title: string; url: string }

type ArticleData = {
  sources?: Source[]
  waterItems?: string[]
  flourTable?: { headers: string[]; rows: string[][] }
}

export function OzoneBakeryConfectioneryPage({ staticData }: { staticData: TolgeeStaticDataProp }) {
  const { t } = useTranslate()
  const lang = useLang()
  const hasLangInRoute = useIsLangInRoute()
  const article = getArticleBySlug(SLUG)

  if (!article) {
    return (
      <Layout>
        <section className="section">
          <div className="container">
            <h1>Article not found</h1>
          </div>
        </section>
      </Layout>
    )
  }

  const articlesHref = hasLangInRoute ? `/${lang}/articles` : '/articles'
  const nsData = (staticData as Record<string, ArticleData>)[`${lang}:${ARTICLE_NS}`]
  const sources = nsData?.sources ?? []
  const waterItems = nsData?.waterItems ?? []
  const flourTable = nsData?.flourTable

  return (
    <Layout>
      <Seo title={t('title', { ns: ARTICLE_NS })} description={t('excerpt', { ns: ARTICLE_NS })} />
      <ArticleHero
        title={t('title', { ns: ARTICLE_NS })}
        description={t('excerpt', { ns: ARTICLE_NS })}
        image={article.image}
        imageAlt={t('title', { ns: ARTICLE_NS })}
        backLink={{ href: articlesHref, label: t('list.backToArticles', { ns: NAMESPACES.articles }) }}
        breadcrumbs={[
          { label: t('footer.home', { ns: NAMESPACES.common }), href: '/' },
          { label: t('nav.articles', { ns: NAMESPACES.common }), href: articlesHref },
          { label: t('title', { ns: ARTICLE_NS }) },
        ]}
      />
      <ArticleContainer>
        <ArticleContent>
          <Paragraph>{t('body.lead', { ns: ARTICLE_NS })}</Paragraph>

          <ArticleSection title={t('sections.losses', { ns: ARTICLE_NS })}>
            <Paragraph>{t('body.losses1', { ns: ARTICLE_NS })}</Paragraph>
            <HighlightBox variant="info">
              <Paragraph>{t('highlightLosses', { ns: ARTICLE_NS })}</Paragraph>
            </HighlightBox>
            <Paragraph>{t('body.losses2', { ns: ARTICLE_NS })}</Paragraph>
          </ArticleSection>

          <ArticleSection title={t('sections.coolingAir', { ns: ARTICLE_NS })}>
            <Paragraph>{t('body.coolingAir1', { ns: ARTICLE_NS })}</Paragraph>
            <Paragraph>{t('body.coolingAir2', { ns: ARTICLE_NS })}</Paragraph>
            <Paragraph>{t('body.coolingAir3', { ns: ARTICLE_NS })}</Paragraph>
          </ArticleSection>

          <ArticleSection title={t('sections.flour', { ns: ARTICLE_NS })}>
            <Paragraph>{t('body.flour1', { ns: ARTICLE_NS })}</Paragraph>
            <Paragraph>{t('body.flour2', { ns: ARTICLE_NS })}</Paragraph>
            {flourTable && (
              <DataTable
                headers={flourTable.headers}
                rows={flourTable.rows}
                caption={t('body.flourTableCaption', { ns: ARTICLE_NS })}
              />
            )}
          </ArticleSection>

          <ArticleSection title={t('sections.confectionery', { ns: ARTICLE_NS })}>
            <Paragraph>{t('body.confectionery1', { ns: ARTICLE_NS })}</Paragraph>
            <Paragraph>{t('body.confectionery2', { ns: ARTICLE_NS })}</Paragraph>
          </ArticleSection>

          <ArticleSection title={t('sections.water', { ns: ARTICLE_NS })}>
            <Paragraph>{t('body.water1', { ns: ARTICLE_NS })}</Paragraph>
            {waterItems.length > 0 && <BulletList items={waterItems} />}
          </ArticleSection>

          <ArticleSection title={t('sections.industry', { ns: ARTICLE_NS })}>
            <Paragraph>{t('body.industry1', { ns: ARTICLE_NS })}</Paragraph>
            <Paragraph>{t('body.industry2', { ns: ARTICLE_NS })}</Paragraph>
          </ArticleSection>

          <ArticleSection title={t('sections.safety', { ns: ARTICLE_NS })}>
            <Paragraph>{t('body.safety1', { ns: ARTICLE_NS })}</Paragraph>
            <HighlightBox variant="warning">
              <Paragraph>{t('highlightSafety', { ns: ARTICLE_NS })}</Paragraph>
            </HighlightBox>
            <Paragraph>{t('body.safety2', { ns: ARTICLE_NS })}</Paragraph>
          </ArticleSection>

          <ArticleSection title={t('sections.conclusion', { ns: ARTICLE_NS })}>
            <Paragraph>{t('body.conclusion', { ns: ARTICLE_NS })}</Paragraph>
          </ArticleSection>

          {sources.length > 0 && <SourcesList items={sources} title={t('sourcesTitle', { ns: ARTICLE_NS })} />}
        </ArticleContent>
      </ArticleContainer>
    </Layout>
  )
}
