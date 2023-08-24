/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {start, registerServiceWorker} from 'pwa-kit-react-sdk/ssr/browser/main'

const main = () => {
    // The path to your service worker should match what is set up in ssr.js
    return Promise.all([start(), registerServiceWorker('/worker.js')])
}

main()

window.onload = () => {
    window.STOREFRONT_PREVIEW = {}

    if (window.STOREFRONT_PREVIEW) {
        window.STOREFRONT_PREVIEW.getToken = () => {
            return window.localStorage.getItem('token')
        }
    }
}