/*
 * Copyright (c) 2023, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import path from 'path'
import glob from 'glob'

/**
 * @class OverridesResolverPlugin
 *
 *  This plugin provides the "Overrides" behavior of the Template Extensibility feature,
 *  allowing third party implementations that depend on an npm module for the base implementation
 *  and then overriding only specific files
 */
class OverridesResolverPlugin {
    /**
     *
     * @param options
     * @param {string} options.overridesDir path to application base
     * @param {string[]} options.overrides paths to overrides
     * @param {string} options.projectDir path to project directory
     */
    constructor(options) {
        // always coerce to posix fs paths, as glob sync and es6 imports don't use windows paths
        this.overridesDir = options.overridesDir?.replace(/\\/g, '/') || ''
        this.extends = options.extends || []
        // always coerce to posix fs paths, as glob sync and es6 imports don't use windows paths
        this.projectDir = options.projectDir?.replace(/\\/g, '/')
        this._allSearchDirs = [this.projectDir + this.overridesDir, ...this.extends]
        this.pkg = require(path.resolve(this.projectDir, 'package.json'))
        this.extendsHashMap = new Map()

        // everything except directories
        // NOTE that the glob library expects posix so we replace windows file paths here
        const globPattern = `${this.pkg?.ccExtensibility?.overridesDir
            ?.replace(/\\/g, '/')
            ?.replace(/^\//, '')}/**/*.*`
        const overridesFsRead = glob.sync(globPattern)
        const overrideReplace = this.pkg?.ccExtensibility?.overridesDir + '/'

        // For each filepath in the overrides directory:
        // Split it in one of two ways:
        // If the filepath is like /pages/home/index.js,
        //    split on index and 'left' is /pages/home/
        // If the filepath is like /pages/home/data.js,
        //    split on the . and 'left' is /pages/home/data
        // The negative lookaheads ensure the split occurs on the last occurence of .
        //    This avoids collisions when both index.js and index.test.js are
        //    present in the same directory
        overridesFsRead.forEach((item) => {
            const end = item.substring(item.lastIndexOf('/index'))
            const [left, ...rest] = item.split(/(index(?!(\.[^.]*\.))|\.(?!([^.]*\.)))/)
            this.extendsHashMap.set(left.replace(overrideReplace, '').replace(/\/$/, ''), [
                end,
                rest.filter(Boolean)
            ])
        })
    }

    /**
     *
     * @param requestPath
     * @param dirs
     */
    findFileFromMap(requestPath, dirs) {
        const fileExt = path.extname(requestPath)
        if (requestPath.includes('routes')) {
            console.log('~requestPath', requestPath)
            console.log('~dirs', dirs)
        }
        for (const dir of dirs) {
            let base = path.join(dir, requestPath)
            if (requestPath.includes('routes')) {
                console.log('~base', base)
            }
            if (fileExt) {
                const noExtPath = requestPath.replace(fileExt, '')
                if (this.extendsHashMap.has(noExtPath)) {
                    console.log('~ 81 returning base', base)
                    return base
                }
            } else {
                if (this.extendsHashMap.has(requestPath)) {
                    const end = this.extendsHashMap.get(requestPath)[1]
                    const isRequestingIndex = end[0] === 'index'
                    let result = base?.replace(/$\//, '') + end.join('')
                    if (isRequestingIndex) {
                        result = path.join(base, this.extendsHashMap.get(requestPath)[1].join(''))
                    }
                    if (requestPath.includes('routes')) {
                        console.log('~exists in hashmap returning result:', result)
                    }
                    return result
                }
                if (requestPath.includes('routes')) {
                    console.log('~not in map returning nothing')
                }
            }
        }
    }

    toOverrideRelative(filepath) {
        const override = this._allSearchDirs.find((dir) => {
            return filepath.indexOf(dir) === 0
        })
        return filepath.substring(override?.length + 1)
    }

    isFromExtends(request, filepath) {
        // in npm namespaces like `@salesforce/<pkg>` we need to ignore the first slash
        const [_pkgName, _path] = request.split('/')
        const pkgName = request?.startsWith('@') ? `${_pkgName}/${_path}` : _pkgName

        return (
            this.extends.includes(pkgName) &&
            // this is very important, to avoid circular imports, check that the
            // `issuer` (requesting context) isn't the overrides directory
            (path.sep === '/'
                ? !filepath.match(this.projectDir + this.overridesDir)
                : !filepath.match(
                      this.projectDir.replace('/', '\\'),
                      this.overridesDir.replace('/', '\\')
                  ))
        )
    }

    handleHook(requestContext, resolveContext, callback, resolver) {
        let targetFile
        let overrideRelative
        if (requestContext.request.includes('routes')) {
            console.log('~===================')
            console.log('~requestContext.request', requestContext.request)
            console.log('~requestContext.path', requestContext.path)
            console.log(
                '~this.isFromExtends(requestContext.request, requestContext.path)',
                this.isFromExtends(requestContext.request, requestContext.path)
            )
        }
        if (this.isFromExtends(requestContext.request, requestContext.path)) {
            overrideRelative = this.toOverrideRelative(requestContext.request).replace(/$\//, '')
            targetFile = this.findFileFromMap(overrideRelative, this._allSearchDirs)
            if (requestContext.request.includes('routes')) {
                console.log('~overrideRelative', overrideRelative)
                console.log('~targetFile', targetFile)
            }
        }
        if (targetFile) {
            const target = resolver.ensureHook('resolved')
            requestContext.path = path.sep === '/' ? targetFile : targetFile.replace('/', '\\')
            console.log('~NEW requestContext.path', requestContext.path)
            resolver.doResolve(
                target,
                requestContext,
                `${this.constructor.name} found base override file`,
                resolveContext,
                callback
            )
        } else {
            return callback()
        }
    }

    apply(resolver) {
        resolver
            .getHook('resolve')
            .tapAsync('FeatureResolverPlugin', (requestContext, resolveContext, callback) => {
                this.handleHook(requestContext, resolveContext, callback, resolver)
            })
    }
}

export default OverridesResolverPlugin
