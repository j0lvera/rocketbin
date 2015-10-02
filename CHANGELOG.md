# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

### [Unreleased][unreleased]

### Added

- SQLite as main database.

### Changed

- `CHANGELOG.md` following [keepachangelog][keepachangelog] template.

### Removed

- MongoDB Support.

## [0.2.0][0.2.0] - 2015-02-17
### Changed

- Switched to Gulp, thanks [@BillCriswell](http://twitter.com/bill)

### Added

- Bash support
- feature to add Name to pastes
- feature to avoid list the pastes in the public list (Private Option)
- [Style Guide]('http://rocketb.in/style-guide')

## [0.1.4][0.1.4] - 2015-01-30

### Removed

- `paste.js`

## [0.1.3][0.1.3] - 2015-01-14

### Added

- Style guide added at `/style-guide` route

### Changed

- Sass folder structure.
- Raw data set to fixed height.

### Fixed

- Bug of `.linenos` showing wrong size.

## [0.1.2][0.1.2] - 2015-01-06

### Added

- Added `favicon.ico`

### Changed

- Replaced Pymongo class `Connection` for `MongoClient`
- `all_entries` renamed to `latest_pastes` on `pastes.py`
- `pastes.html` renamted to `latest_pastes.html`

### Removed

- Removed my GA and WMT verification code.

## [0.1.1][0.1.1] - 2014-12-27

### Added

- MIT License.
- CSS styling.

### Changed

- Sorting paste by date fixed.

## [0.1.0][0.1.0] - 2014-12-17

### Added

- Autocomplete for Ace.js.
- Emmet mode for Ace.js.
- Vim mode for Ace.js.
- Emacs mode for Ace.js.

### Removed

- User management.

[unreleased]: https://github.com/thinkxl/rocketbin/compare/v0.2.0...HEAD
[0.1.3]: https://github.com/thinkxl/rocketbin/compare/v0.1.3...v0.2.0
[0.1.2]: https://github.com/thinkxl/rocketbin/compare/v0.1.2...v0.1.3
[0.1.1]: https://github.com/thinkxl/rocketbin/compare/v0.1.1...v0.1.2
[0.1.0]: https://github.com/thinkxl/rocketbin/compare/v0.1.0...v0.1.1
[keepachangelog]: http://keepachangelog.com/
