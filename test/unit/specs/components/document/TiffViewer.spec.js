import {mount} from 'vue-test-utils'
import TiffViewer from '@/components/document/TiffViewer'

describe('TiffViewer.vue', () => {
  it('should display error when tiff is not found', async () => {
    var wrapped = mount(TiffViewer, {propsData: {'url': 'invalid.url'}})
    await wrapped.vm.page(1)
    wrapped.update()

    expect(wrapped.vm.$el.querySelector('.alert').textContent).to.contain('404 Not Found')
  })
})
