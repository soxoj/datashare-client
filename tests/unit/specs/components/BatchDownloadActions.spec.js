import Api from '@/api'
import { flushPromises } from 'tests/unit/tests_utils'
import BatchDownloadActions from '@/components/BatchDownloadActions'
import { Core } from '@/core'
import { createLocalVue, mount } from '@vue/test-utils'

describe('BatchDownloadActions.vue', () => {
  const { i18n, localVue } = Core.init(createLocalVue()).useAll()
  const projects = [{ name: 'project' }]

  function mockRunBatchDownload (batchDownload) {
    // Returns data
    const data = {
      name: 'BatchDownloadTask',
      progress: 0,
      state: 'RUNNING',
      user: batchDownload.user,
      properties: { batchDownload }
    }
    // Mock the `runBatchDownload` method
    const spy = jest.spyOn(Api.prototype, 'runBatchDownload')
      .mockImplementation(Promise.resolve(data))
    return { batchDownload, data, spy }
  }

  beforeEach(async () => {
    await flushPromises()
    // Then clear all mocks
    jest.clearAllMocks()
  })

  describe('relaunch method', () => {
    it('should emit an error when the relaunch fails', async () => {
      const query = ';ERRORED;'
      const { batchDownload: value } = mockRunBatchDownload({ projects, query })
      const propsData = { value }
      const wrapper = mount(BatchDownloadActions, { propsData, i18n, localVue })
      await wrapper.vm.relaunch()
      expect(wrapper.emitted('reluanchFailed'))
    })

    it('should emit a success when the relaunch', async () => {
      const query = '{ }'
      const { batchDownload: value } = mockRunBatchDownload({ projects, query })
      const propsData = { value }
      const wrapper = mount(BatchDownloadActions, { propsData, i18n, localVue })
      await wrapper.vm.relaunch()
      expect(wrapper.emitted('reluanched'))
    })

    it('should call the API with a parsed query', async () => {
      const query = '{ "foo": "bar" }'
      const { batchDownload: value, spy } = mockRunBatchDownload({ projects, query })
      const propsData = { value }
      const wrapper = mount(BatchDownloadActions, { propsData, i18n, localVue })
      await wrapper.vm.relaunch()
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ query: { foo: 'bar' } }))
    })

    it('should call the API with a list of projects', async () => {
      const { batchDownload: value, spy } = mockRunBatchDownload({ projects })
      const propsData = { value }
      const projectIds = ['project']
      const wrapper = mount(BatchDownloadActions, { propsData, i18n, localVue })
      await wrapper.vm.relaunch()
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ projectIds }))
    })
  })

  describe('parsing query to searchRoute', () => {
    it('with contentType and extractionLevel filters', async () => {
      const query = JSON.stringify({
        bool: {
          filter: {
            bool: {
              must: [
                {
                  terms: {
                    contentType: ['application/pdf']
                  }
                },
                {
                  terms: {
                    extractionLevel: ['0']
                  }
                }
              ]
            }
          }
        }
      })
      const { batchDownload: value } = mockRunBatchDownload({ projects, query })
      const propsData = { value }
      const wrapper = mount(BatchDownloadActions, { propsData, i18n, localVue })
      expect(wrapper.vm.searchRoute.query['f[contentType]']).toContain('application/pdf')
      expect(wrapper.vm.searchRoute.query['f[extractionLevel]']).toContain('0')
    })

    it('with two extractionLevel filters', async () => {
      const query = JSON.stringify({
        bool: {
          filter: {
            bool: {
              must: [
                {
                  terms: {
                    extractionLevel: ['0', '1']
                  }
                }
              ]
            }
          }
        }
      })
      const { batchDownload: value } = mockRunBatchDownload({ projects, query })
      const propsData = { value }
      const wrapper = mount(BatchDownloadActions, { propsData, i18n, localVue })
      expect(wrapper.vm.searchRoute.query['f[extractionLevel]']).toContain('0')
      expect(wrapper.vm.searchRoute.query['f[extractionLevel]']).toContain('1')
    })

    it('with a query string', async () => {
      const query = JSON.stringify({
        bool: {
          must: [
            {
              match_all: {}
            },
            {
              bool: {
                should: [
                  {
                    query_string: {
                      query: 'FOO'
                    }
                  }
                ]
              }
            },
            {
              match: {
                type: 'Document'
              }
            }
          ]
        }
      })
      const { batchDownload: value } = mockRunBatchDownload({ projects, query })
      const propsData = { value }
      const wrapper = mount(BatchDownloadActions, { propsData, i18n, localVue })
      expect(wrapper.vm.searchRoute.query.q).toContain('FOO')
    })

    it('with a contentType negative filter', async () => {
      const query = JSON.stringify({
        bool: {
          filter: {
            bool: {
              must: [
                {
                  terms: {
                    extractionLevel: ['0']
                  }
                }
              ],
              must_not: [
                {
                  terms: {
                    contentType: ['application/pdf']
                  }
                }
              ]
            }
          }
        }
      })
      const { batchDownload: value } = mockRunBatchDownload({ projects, query })
      const propsData = { value }
      const wrapper = mount(BatchDownloadActions, { propsData, i18n, localVue })
      expect(wrapper.vm.searchRoute.query['f[-contentType]']).toContain('application/pdf')
    })

    it('with extractionLevel filter and contentType negative filter ', async () => {
      const query = JSON.stringify({
        bool: {
          filter: {
            bool: {
              must: [
                {
                  terms: {
                    extractionLevel: ['0']
                  }
                }
              ],
              must_not: [
                {
                  terms: {
                    contentType: ['application/pdf']
                  }
                }
              ]
            }
          }
        }
      })
      const { batchDownload: value } = mockRunBatchDownload({ projects, query })
      const propsData = { value }
      const wrapper = mount(BatchDownloadActions, { propsData, i18n, localVue })
      expect(wrapper.vm.searchRoute.query['f[extractionLevel]']).toContain('0')
      expect(wrapper.vm.searchRoute.query['f[-contentType]']).toContain('application/pdf')
    })

    it('with project', async () => {
      const { batchDownload: value } = mockRunBatchDownload({ projects })
      const propsData = { value }
      const wrapper = mount(BatchDownloadActions, { propsData, i18n, localVue })
      expect(wrapper.vm.searchRoute.query.indices).toContain('project')
    })
  })
})
