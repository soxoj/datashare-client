import Vue from 'vue'
import VueRouter from 'vue-router'

import App from '@/pages/App'
import DocumentView from '@/pages/DocumentView'
import Indexing from '@/pages/Indexing'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Search from '@/pages/Search'
import BatchSearch from '@/pages/BatchSearch'
import BatchSearchResults from '@/pages/BatchSearchResults'

import store from '@/store'
import { isAuthenticated } from '@/utils/utils'
import get from 'lodash/get'

import { EventBus } from '@/utils/event-bus'

Vue.use(VueRouter)

const router = new VueRouter({
  routes: [
    {
      path: '/',
      component: App,
      children: [
        {
          name: 'landing',
          path: '',
          component: Landing,
          beforeEnter: (to, from, next) => {
            // This allow to restore the search's state from localStorage
            // even if we are loading this route from a children (where no
            // query parameters are given).
            if (to.query.q) {
              next({ name: 'search', query: to.query })
            }
            next()
          }
        },
        {
          name: 'search',
          path: '',
          component: Search,
          beforeEnter: (to, from, next) => {
            // This allow to restore the search's state from localStorage
            // even if we are loading this route from a children (where no
            // query parameters are given).
            if (to.name === 'search') {
              store.dispatch('search/updateFromRouteQuery', to.query)
            }
            next()
          },
          children: [
            {
              name: 'document',
              path: 'd/:index/:id/:routing?',
              alias: 'e/:index/:id/:routing?',
              component: DocumentView,
              props: true
            }
          ]
        },
        {
          name: 'indexing',
          path: 'indexing',
          component: Indexing
        },
        {
          name: 'batch-search',
          path: 'batch-search',
          component: BatchSearch,
          children: [
            {
              name: 'batch-search.results',
              path: ':index/:uuid',
              component: BatchSearchResults,
              props: true
            }
          ]
        }
      ]
    },
    {
      name: 'document-simplified',
      path: '/ds/:index/:id/:routing?',
      component: DocumentView
    },
    {
      path: '/login',
      component: Login,
      meta: {
        skipsAuth: true
      }
    }
  ]
})

router.beforeEach((to, from, next) => {
  // Read the current index from the params
  if (to.params.index && store.state.search.index !== to.params.index) {
    store.commit('search/index', to.params.index)
  }
  // True if the authentication must be skipped
  const skipsAuth = to.matched.some(r => get(r, 'meta.skipsAuth', false))
  if (skipsAuth || isAuthenticated()) {
    next()
  } else {
    next('/login')
  }
})

EventBus.$on('http::error', err => {
  if (err && err.status === 401) {
    window.location.assign(process.env.VUE_APP_DS_AUTH_SIGNIN)
  }
})

export default router
