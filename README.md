# Edit Bookmark Plus

Edit Bookmark Plus is an extension for Firefox. To know more, see [extension's page on addons.mozilla.org](https://addons.mozilla.org/firefox/addon/edit-bookmark-plus/).


## Build xpi


### Pre requisite
You must have grunt installed on your system that means you should have node and npm installed as well.

### Installing grunt plugins
Run the following in the repository root directory to install all the required grunt plugins: 

```
npm install
```

This step is required only once.

### Generating xpi
Once all the required grunt plugins are installed, type the following in the repository root directory:

```
grunt
```

A directory named dist would be created and would have the xpi file. The version of extension is obtained from package.json file.