import BatchSearchResults from '@/pages/BatchSearchResults'
import { createLocalVue, mount } from '@vue/test-utils'
import VueI18n from 'vue-i18n'
import Vuex from 'vuex'
import messages from '@/lang/en'
import store from '@/store'
import BootstrapVue from 'bootstrap-vue'
import VueProgressBar from 'vue-progressbar'
import Murmur from '@icij/murmur'
import VueRouter from 'vue-router'
import { IndexedDocument, letData } from 'tests/unit/es_utils'
import esConnectionHelper from 'tests/unit/specs/utils/esConnectionHelper'

jest.mock('@/api/DatashareClient', () => {
  return jest.fn(() => {
    return {
      getBatchSearches: jest.fn().mockReturnValue(Promise.resolve([
        {
          uuid: '12',
          project: { name: 'ProjectName' },
          description: 'This is the description of the batch search',
          queries: ['query_01', 'query_02', 'query_03'],
          state: 'SUCCESS',
          date: '2019-07-18T14:45:34.869+0000',
          nbResults: 172
        }, {
          uuid: '13',
          project: { name: 'ProjectName2' },
          description: 'Another description',
          queries: ['query_04'],
          state: 'SUCCESS',
          date: '2019-07-28T14:45:34.869+0000',
          nbResults: 15
        }
      ])),
      getBatchSearchResults: jest.fn().mockReturnValue(Promise.resolve([
        {
          creationDate: '2011-10-11T04:12:49.000+0000',
          documentId: 42,
          documentNumber: 0,
          documentName: '42.pdf',
          contentType: 'type_03',
          query: 'query_01',
          rootId: 42
        }, {
          creationDate: '2011-10-11T04:12:49.000+0000',
          documentId: 43,
          documentNumber: 1,
          documentName: '43.pdf',
          contentType: 'type_02',
          query: 'query_01',
          rootId: 43
        }, {
          creationDate: '2011-10-11T04:12:49.000+0000',
          documentId: 44,
          documentNumber: 2,
          documentName: '44.pdf',
          contentType: 'type_01',
          query: 'query_02',
          rootId: 44
        }
      ]))
    }
  })
})

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(VueI18n)
localVue.use(Murmur)
localVue.use(BootstrapVue)
localVue.use(VueRouter)
localVue.use(VueProgressBar)
const i18n = new VueI18n({ locale: 'en', messages: { 'en': messages } })
const router = new VueRouter({ routes: [
  {
    path: 'batch-search/:index/:uuid',
    name: 'batch-search.results'
  }, {
    name: 'document',
    path: '/d/:index/:id/:routing?'
  }
] })

describe('BatchSearchResultsList.vue', () => {
  esConnectionHelper()
  const es = esConnectionHelper.es
  let wrapper

  beforeAll(() => Murmur.config.merge({ userIndices: [process.env.VUE_APP_ES_INDEX] }))

  beforeEach(async () => {
    store.commit('batchSearch/index', process.env.VUE_APP_ES_INDEX)
    await letData(es).have(new IndexedDocument('42').withContentType('type_01')).commit()
    await letData(es).have(new IndexedDocument('43').withContentType('type_01')).commit()
    await letData(es).have(new IndexedDocument('44').withContentType('type_01')).commit()
    store.commit('batchSearch/batchSearches', [{
      uuid: '12',
      project: { name: 'ProjectName' },
      description: 'This is the description of the batch search',
      queries: ['query_01', 'query_02', 'query_03'],
      state: 'SUCCESS',
      date: '2019-07-18T14:45:34.869+0000',
      nbResults: 172
    }, {
      uuid: '13',
      project: { name: 'ProjectName2' },
      description: 'Another description',
      queries: ['query_04'],
      state: 'SUCCESS',
      date: '2019-07-28T14:45:34.869+0000',
      nbResults: 15
    }])
    const propsData = { uuid: '12', index: process.env.VUE_APP_ES_INDEX }
    wrapper = mount(BatchSearchResults, { localVue, i18n, store, router, computed: { downloadLink () { return 'mocked-download-link' } }, propsData })
    await wrapper.vm.$router.push({ name: 'batch-search.results', params: { index: process.env.VUE_APP_ES_INDEX, uuid: '12' }, query: { from: 50, size: 25 } })
    await wrapper.vm.fetch()
  })

  afterEach(() => store.commit('batchSearch/reset'))

  it('should display the list of the queries of this batch search', () => {
    expect(wrapper.find('.batch-search-results').exists()).toBeTruthy()
    expect(wrapper.findAll('.batch-search-results__queries__query')).toHaveLength(3)
  })

  it('should display a link to document page', () => {
    expect(wrapper.findAll('.batch-search-results__queries__query__link')).toHaveLength(3)
    expect(wrapper.findAll('.batch-search-results__queries__query__link').at(0).attributes('href')).toBe(`#/d/${process.env.VUE_APP_ES_INDEX}/42/42`)
    expect(wrapper.findAll('.batch-search-results__queries__query__link').at(1).attributes('href')).toBe(`#/d/${process.env.VUE_APP_ES_INDEX}/43/43`)
    expect(wrapper.findAll('.batch-search-results__queries__query__link').at(2).attributes('href')).toBe(`#/d/${process.env.VUE_APP_ES_INDEX}/44/44`)
  })

  it('should display a button to download the results as a CSV file', () => {
    expect(wrapper.find('.batch-search-results__download').exists()).toBeTruthy()
  })

  it('should display info about the BatchSearch', () => {
    expect(wrapper.find('.batch-search-results__info').exists()).toBeTruthy()
    expect(wrapper.findAll('.batch-search-results__info dd')).toHaveLength(4)
  })

  it('should refresh route on "batch-search-results::filter" event emitted', () => {
    jest.spyOn(router, 'push')

    wrapper.vm.$root.$emit('batch-search-results::filter')

    expect(router.push).toBeCalled()
  })

  it('should re-route on sort changed', async () => {
    jest.spyOn(router, 'push')

    await wrapper.vm.sortChanged({ sortBy: 'contentType', sortDesc: true })

    expect(router.push).toBeCalled()
    expect(router.push).toBeCalledWith({ name: 'batch-search.results', params: { index: `${process.env.VUE_APP_ES_INDEX}`, uuid: '12' }, query: { from: 0, order: 'desc', queries: [], size: 100, sort: 'content_type' } })
  })
})
