'use strict';
const path = require('node:path');
const build = require('@microsoft/sp-build-web');
const registerSpfxUiProfileGulp = require('./src/vendor/source-editor/spfx-ui-profile-gulp.cjs');

registerSpfxUiProfileGulp(build, { appRoot: path.resolve(__dirname) });
build.initialize(require('gulp'));
