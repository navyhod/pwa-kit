/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import useAuthContext from './useAuthContext'
import useLocalStorage from './useLocalStorage'
import useConfig from './useConfig'

const onClient = typeof window !== 'undefined'

/**
 * Hook that returns the ecom user ID.
 *
 * This is sometimes used as the user ID for Einstein.
 *
 */
const useEncUserId = (): string | null => {
    const config = useConfig()
    const auth = useAuthContext()

    return onClient
        ? // This conditional is a constant value based on the environment, so the same path will
          // always be followed., and the "rule of hooks" is not violated.
          // eslint-disable-next-line react-hooks/rules-of-hooks
          useLocalStorage(`${config.siteId}_enc_user_id`)
        : auth.get('enc_user_id')
}

export default useEncUserId
