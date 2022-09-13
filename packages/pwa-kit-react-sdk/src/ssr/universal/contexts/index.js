/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React, {useEffect} from 'react'
import PropTypes from 'prop-types'
import {useLocation} from 'react-router-dom'
import {uuidv4} from 'pwa-kit-runtime/utils/uuidv4'

import DeviceContext from '../device-context'

const ExpressContext = React.createContext()

const CorrelationIdContext = React.createContext()

const CorrelationIdProvider = ({children, correlationId}) => {
    // console.log('default correlationId', correlationId)
    const [id, setId] = React.useState(correlationId || uuidv4())
    const location = useLocation()

    useEffect(() => {
        const newId = uuidv4()
        setId(newId)
        console.log('location', location)
    }, [location.pathname])
    return (
        <CorrelationIdContext.Provider value={{correlationId: id}}>
            {children}
        </CorrelationIdContext.Provider>
    )
}

CorrelationIdProvider.propTypes = {
    children: PropTypes.element.isRequired,
    correlationId: PropTypes.string,
    location: PropTypes.object
}

export {CorrelationIdContext, CorrelationIdProvider, DeviceContext, ExpressContext}
