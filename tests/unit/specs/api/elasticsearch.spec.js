import toLower from 'lodash/toLower'
import bodybuilder from 'bodybuilder'

import elasticsearch from '@/api/elasticsearch'
import esConnectionHelper from 'tests/unit/specs/utils/esConnectionHelper'
import { EventBus } from '@/utils/event-bus'
import { FilterText, FilterNamedEntity } from '@/store/filtersStore'
import { IndexedDocument, letData } from 'tests/unit/es_utils'

describe('elasticsearch', () => {
  const index = toLower('elasticsearch')
  esConnectionHelper(index)
  const es = esConnectionHelper.es

  it('should return backend response to a POST request for searchDocs', async () => {
    const spy = jest.spyOn(elasticsearch, 'search').mockImplementation(() => Promise.resolve({ 'foo': 'bar' }))
    const response = await elasticsearch.searchDocs(index, '*')
    expect(response).toEqual({ 'foo': 'bar' })
    spy.mockRestore()
  })

  it('should emit an error if the backend response is an error', async () => {
    const spy = jest.spyOn(elasticsearch, 'search').mockImplementation(() => Promise.reject(new Error('this is an error')))
    const mockCallback = jest.fn()
    EventBus.$on('http::error', mockCallback)

    await expect(elasticsearch.searchDocs(index, '*')).rejects.toThrow('this is an error')

    expect(mockCallback.mock.calls.length).toBe(1)
    expect(mockCallback.mock.calls[0][0].message).toEqual('this is an error')
    spy.mockRestore()
  })

  it('should build an ES query with filters', async () => {
    let filters = [new FilterText('contentType', 'contentType', true, null)]
    filters[0].values = ['value_01', 'value_02', 'value_03']
    const body = bodybuilder().from(0).size(25)

    await elasticsearch._addFiltersToBody(filters, body)

    expect(body.build()).toEqual({
      from: 0,
      size: 25,
      query: {
        bool: {
          filter: {
            terms: {
              contentType: ['value_01', 'value_02', 'value_03']
            }
          }
        }
      }
    })
  })

  it('should build a simple ES query', async () => {
    const body = bodybuilder().from(0).size(25)

    await elasticsearch.addQueryToBody('*', body)

    expect(body.build()).toEqual({
      from: 0,
      size: 25,
      query: {
        bool: {
          must: [{
            match_all: {}
          }, {
            bool: {
              should: [{
                query_string: {
                  query: '*',
                  fields: undefined,
                  default_field: '*'
                }
              }, {
                has_child: {
                  type: 'NamedEntity',
                  query: {
                    query_string: {
                      query: '*',
                      default_field: 'mentionNorm'
                    }
                  }
                }
              }]
            }
          }]
        }
      }
    })
  })

  it('should build a simple ES query and escape slash in it', async () => {
    const body = bodybuilder().from(0).size(25)

    await elasticsearch.addQueryToBody('path:/home/datashare/path/*', body)

    expect(body.build()).toEqual({
      from: 0,
      size: 25,
      query: {
        bool: {
          must: [{
            match_all: {}
          }, {
            bool: {
              should: [{
                query_string: {
                  query: 'path:/home/datashare/path/*',
                  default_field: '*'
                }
              }, {
                has_child: {
                  type: 'NamedEntity',
                  query: {
                    query_string: {
                      query: 'path:/home/datashare/path/*',
                      default_field: 'mentionNorm'
                    }
                  }
                }
              }]
            }
          }]
        }
      }
    })
  })

  it('should build a simple sorted ES query', async () => {
    const body = bodybuilder().from(0).size(25)

    await elasticsearch.addSortToBody('dateOldest', body)

    expect(body.build()).toEqual({
      from: 0,
      size: 25,
      sort: [{
        extractionDate: {
          order: 'asc'
        }
      }, {
        path: {
          order: 'asc'
        }
      }]
    })
  })

  it('should build a simple sorted ES query with correct path sort', async () => {
    const body = bodybuilder().from(0).size(25)

    await elasticsearch.addSortToBody('pathReverse', body)

    expect(body.build()).toEqual({
      from: 0,
      size: 25,
      sort: [{
        path: {
          order: 'desc'
        }
      }]
    })
  })

  it('should return the first 12 named entities', async () => {
    const id = 'document'
    await letData(es).have(new IndexedDocument(id, index)
      .withNer('ne_01')
      .withNer('ne_02')
      .withNer('ne_03')
      .withNer('ne_04')
      .withNer('ne_05')
      .withNer('ne_06')
      .withNer('ne_07')
      .withNer('ne_08')
      .withNer('ne_09')
      .withNer('ne_10')
      .withNer('ne_11')
      .withNer('ne_12')
    ).commit()

    const response = await elasticsearch.getDocumentNamedEntities(index, id, id, 0, 20)

    expect(response.hits.hits).toHaveLength(12)
  })

  it('should return all the named entities', async () => {
    await letData(es).have(new IndexedDocument('document_01', index)
      .withContent('this is a document')
      .withNer('ne_01')
    ).commit()
    await letData(es).have(new IndexedDocument('document_02', index)
      .withNer('document')
    ).commit()
    await letData(es).have(new IndexedDocument('document_03', index)
      .withContent('nothing to write')
      .withNer('another')
    ).commit()
    const filter = new FilterNamedEntity('namedEntityPerson', 'byMentions', true, 'PERSON')

    const response = await elasticsearch.searchFilter(index, filter, 'document')

    expect(response.aggregations.byMentions.buckets).toHaveLength(2)
  })
})