import SearchResultsHeader from '@/components/SearchResultsHeader'
import { IndexedDocument, IndexedDocuments, letData } from 'tests/unit/es_utils'
import { createLocalVue, shallowMount } from '@vue/test-utils'
import esConnectionHelper from 'tests/unit/specs/utils/esConnectionHelper'
import VueI18n from 'vue-i18n'
import Murmur from '@icij/murmur'
import messages from '@/lang/en'
import store from '@/store'
import router from '@/router'
import vBTooltip from 'bootstrap-vue/es/directives/tooltip/tooltip'
import { datashare } from '@/store/modules/search'
import { jsonOk } from 'tests/unit/tests_utils'

const localVue = createLocalVue()
localVue.use(VueI18n)
localVue.use(Murmur)
localVue.directive('b-tooltip', vBTooltip)
const i18n = new VueI18n({ locale: 'en', messages: { 'en': messages } })

describe('SearchResultsHeader.vue', () => {
  esConnectionHelper()
  const es = esConnectionHelper.es
  let wrapper

  beforeAll(() => store.commit('search/index', process.env.VUE_APP_ES_INDEX))

  beforeEach(() => {
    wrapper = shallowMount(SearchResultsHeader, { localVue, i18n, store, router })
    store.commit('search/reset')
    jest.spyOn(datashare, 'fetch')
    datashare.fetch.mockReturnValue(jsonOk())
  })

  afterAll(() => datashare.fetch.mockRestore())

  it('should display one document', async () => {
    await letData(es).have(new IndexedDocument('doc.txt').withContent('bar')).commit()

    await store.dispatch('search/query', 'bar')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.search-results-header__paging__progress__pagination').text()).toEqual('1 - 1')
    expect(wrapper.find('.search-results-header__paging__progress_number-of-results').text()).toEqual('on 1 document')
  })

  it('should display 2 documents', async () => {
    await letData(es).have(new IndexedDocument('doc_011.txt').withContent('bar')).commit()
    await letData(es).have(new IndexedDocument('doc_02.txt').withContent('bar')).commit()

    await store.dispatch('search/query', 'bar')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.search-results-header__paging__progress__pagination').text()).toEqual('1 - 2')
    expect(wrapper.find('.search-results-header__paging__progress_number-of-results').text()).toEqual('on 2 documents')
  })

  it('should not display the pagination (1/2)', async () => {
    await store.dispatch('search/query', '*')
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.search-results-header__paging__first-page')).toHaveLength(0)
    expect(wrapper.findAll('.search-results-header__paging__previous-page')).toHaveLength(0)
    expect(wrapper.findAll('.search-results-header__paging__next-page')).toHaveLength(0)
    expect(wrapper.findAll('.search-results-header__paging__last-page')).toHaveLength(0)
  })

  it('should not display the pagination (2/2)', async () => {
    await letData(es).have(new IndexedDocument('doc.txt').withContent('document')).commit()

    await store.dispatch('search/query', 'document')
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.search-results-header__paging__first-page')).toHaveLength(0)
    expect(wrapper.findAll('.search-results-header__paging__previous-page')).toHaveLength(0)
    expect(wrapper.findAll('.search-results-header__paging__next-page')).toHaveLength(0)
    expect(wrapper.findAll('.search-results-header__paging__last-page')).toHaveLength(0)
  })

  it('should display the pagination', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('document').count(4)).commit()

    await store.dispatch('search/query', { query: 'document', from: 0, size: 3 })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.search-results-header__paging__first-page')).toHaveLength(1)
    expect(wrapper.findAll('.search-results-header__paging__previous-page')).toHaveLength(1)
    expect(wrapper.findAll('.search-results-header__paging__next-page')).toHaveLength(1)
    expect(wrapper.findAll('.search-results-header__paging__last-page')).toHaveLength(1)
    expect(wrapper.find('.search-results-header__paging__progress__pagination').text()).toEqual('1 - 3')
    expect(wrapper.find('.search-results-header__paging__progress_number-of-results').text()).toEqual('on 4 documents')
  })

  it('should display the first and the previous page as unavailable', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('this is a document').count(4)).commit()

    await store.dispatch('search/query', { query: 'document', from: 0, size: 3 })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.search-results-header__paging__first-page.disabled')).toHaveLength(1)
    expect(wrapper.findAll('.search-results-header__paging__previous-page.disabled')).toHaveLength(1)
    expect(wrapper.findAll('.search-results-header__paging__next-page.disabled')).toHaveLength(0)
    expect(wrapper.findAll('.search-results-header__paging__last-page.disabled')).toHaveLength(0)
  })

  it('should display the next and the last page as unavailable', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('this is a document').count(4)).commit()

    await store.dispatch('search/query', { query: 'document', from: 3, size: 3 })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.search-results-header__paging__first-page.disabled')).toHaveLength(0)
    expect(wrapper.findAll('.search-results-header__paging__previous-page.disabled')).toHaveLength(0)
    expect(wrapper.findAll('.search-results-header__paging__next-page.disabled')).toHaveLength(1)
    expect(wrapper.findAll('.search-results-header__paging__last-page.disabled')).toHaveLength(1)
    expect(wrapper.find('.search-results-header__paging__progress__pagination').text()).toEqual('4 - 4')
    expect(wrapper.find('.search-results-header__paging__progress_number-of-results').text()).toEqual('on 4 documents')
  })

  it('should generate the link to the first page', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('document').count(15)).commit()

    await store.dispatch('search/query', { query: 'document', from: 6, size: 3 })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.firstPageLinkParameters()).toMatchObject({ name: 'search', query: { q: 'document', from: 0, size: 3, sort: 'relevance', index: 'datashare-testjs' } })
  })

  it('should generate the link to the previous page', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('document').count(15)).commit()

    await store.dispatch('search/query', { query: 'document', from: 6, size: 3 })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.previousPageLinkParameters()).toMatchObject({ name: 'search', query: { q: 'document', from: 3, size: 3, sort: 'relevance', index: 'datashare-testjs' } })
  })

  it('should generate the link to the next page', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('document').count(15)).commit()

    await store.dispatch('search/query', { query: 'document', from: 6, size: 3 })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.nextPageLinkParameters()).toMatchObject({ name: 'search', query: { q: 'document', from: 9, size: 3, sort: 'relevance', index: 'datashare-testjs' } })
  })

  it('should generate the link to the last page', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('document').count(15)).commit()

    await store.dispatch('search/query', { query: 'document', from: 6, size: 3 })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.lastPageLinkParameters()).toMatchObject({ name: 'search', query: { q: 'document', from: 12, size: 3, sort: 'relevance', index: 'datashare-testjs' } })
  })

  it('should display an applied filters component on top position', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('document').count(3)).commit()

    await store.dispatch('search/query', { query: '*', from: 0, size: 3 })
    wrapper.setProps({ position: 'top' })

    expect(wrapper.findAll('search-results-applied-filters-stub')).toHaveLength(1)
  })

  it('should not display an applied filters component on bottom position', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('document').count(3)).commit()

    await store.dispatch('search/query', { query: '*', from: 0, size: 3 })
    wrapper.setProps({ position: 'bottom' })

    expect(wrapper.findAll('search-results-applied-filters-stub')).toHaveLength(0)
  })
})
