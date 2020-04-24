import features from '@/mixins/features'

export { default as WidgetDocumentsByCreationDate } from './WidgetDocumentsByCreationDate'
export { default as WidgetDocumentsByCreationDateByPath } from './WidgetDocumentsByCreationDateByPath'
export { default as WidgetEmpty } from './WidgetEmpty'
export { default as WidgetFileBarometer } from './WidgetFileBarometer'
export { default as WidgetText } from './WidgetText'

const widgets = [
  { name: 'default-text', card: true, cols: 8, type: 'WidgetText', title: 'Insights' },
  { name: 'file-barometer', card: true, cols: 4, type: 'WidgetFileBarometer' },
  { name: 'documents-by-creation-date', card: true, cols: 12, type: 'WidgetDocumentsByCreationDate', title: 'Number of documents by creation date' }
]

if (features.methods.hasFeature('WIDGET_CREATION_DATE_SOURCE')) {
  widgets.push(
    { card: true, cols: 12, type: 'WidgetDocumentsByCreationDateByPath', title: 'Number of documents by creation date by source' }
  )
}

export default widgets
