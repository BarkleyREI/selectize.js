var fs = require("fs");
const sass = require("node-sass");

module.exports = function (grunt) {
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-connect");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-replace");
  grunt.loadNpmTasks("grunt-sass");

  grunt.registerTask("configure", ["clean:pre"]);

  grunt.registerTask("compile", [
    "copy:scss",
    "copy:scss_plugins",
    "concat:scss_plugins",
    "concat:js",
    "sass:uncompressed",
    "replace",
    "build_standalone",
    "uglify",
    "clean:post",
  ]);

  grunt.registerTask("default", ["configure", "compile"]);

  grunt.registerTask("serve", ["connect", "watch"]);

  grunt.registerTask("build_standalone", "", function () {
    var files,
      i,
      n,
      source,
      name,
      path,
      modules = [];

    // amd definitions must be changed to be not anonymous
    // @see https://github.com/brianreavis/selectize.js/issues/89
    files = [];
    for (i = 0, n = files_js_dependencies.length; i < n; i++) {
      path = files_js_dependencies[i];
      name = path.match(/([^\/]+?).js$/)[1];
      source = grunt.file
        .read(path)
        .replace("define(factory);", "define('" + name + "', factory);");
      modules.push(source);
    }

    path = "dist/js/selectize.js";
    source = grunt.file
      .read(path)
      .replace(/define\((.*?)factory\);/, "define('selectize', $1factory);");
    modules.push(source);

    // write output
    path = "dist/js/standalone/selectize.js";
    grunt.file.write(path, modules.join("\n\n"));
    grunt.log.writeln('Built "' + path + '".');
  });

  var files_js = [
    "src/contrib/*.js",
    "src/*.js",
    "!src/.wrapper.js",
    "!src/defaults.js",
    "!src/selectize.js",
    "!src/selectize.jquery.js",
    "src/selectize.js",
    "src/defaults.js",
    "src/selectize.jquery.js",
  ];

  var files_js_dependencies = [
    "node_modules/sifter/sifter.js",
    "node_modules/microplugin/src/microplugin.js",
  ];

  var scss_imports = [];
  var scss_plugin_files = [];

  // enumerate plugins
  (function () {
    var selector_plugins = grunt.option("plugins");
    if (!selector_plugins) return;

    if (selector_plugins.indexOf(",") !== -1) {
      selector_plugins =
        "{" + selector_plugins.split(/\s*,\s*/).join(",") + "}";
    }

    // javascript
    files_js.push("src/plugins/" + selector_plugins + "/*.js");

    // less (css)
    var matched_files = grunt.file.expand([
      "src/plugins/" + selector_plugins + "/plugin.scss",
    ]);
    for (var i = 0, n = matched_files.length; i < n; i++) {
      var plugin_name = matched_files[i].match(/src\/plugins\/(.+?)\//)[1];
      scss_imports.push('@import "plugins/' + plugin_name + '";');
      scss_plugin_files.push({
        src: matched_files[i],
        dest: "dist/scss/plugins/" + plugin_name + ".scss",
      });
    }
  })();

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    clean: {
      pre: ["dist"],
      post: ["**/*.tmp*"],
    },
    copy: {
      scss_plugins: {
        files: scss_plugin_files,
      },
      scss: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ["src/scss/*.scss"],
            dest: "dist/scss",
          },
        ],
      },
    },
    replace: {
      options: { prefix: "@@" },
      main: {
        options: {
          variables: {
            version: "<%= pkg.version %>",
            js:
              '<%= grunt.file.read("dist/js/selectize.js").replace(/\\n/g, "\\n\\t") %>',
            css: '<%= grunt.file.read("dist/css/selectize.css") %>',
          },
        },
        files: [
          { src: ["src/.wrapper.js"], dest: "dist/js/selectize.js" },
          { src: ["src/.wrapper.css"], dest: "dist/css/selectize.css" },
        ],
      },
      css_post: {
        options: {
          variables: {
            version: "<%= pkg.version %>",
          },
        },
        files: [
          { expand: true, flatten: false, src: ["dist/css/*.css"], dest: "" },
          { expand: true, flatten: false, src: ["dist/scss/*.scss"], dest: "" },
          {
            expand: true,
            flatten: false,
            src: ["dist/scss/plugins/*.scss"],
            dest: "",
          },
        ],
      },
    },
    sass: {
      options: {
        implementation: sass,
        sourceMap: true,
      },
      uncompressed: {
        files: {
          "dist/css/selectize.css": ["src/scss/selectize.scss"],
          "dist/css/selectize.default.css": [
            "src/scss/selectize.default.scss",
          ],
          "dist/css/selectize.bootstrap.css": [
            "src/scss/selectize.bootstrap.scss",
          ],
        },
      },
    },
    concat: {
      options: {
        stripBanners: true,
        separator: grunt.util.linefeed + grunt.util.linefeed,
      },
      js: {
        files: {
          "dist/js/selectize.js": files_js,
        },
      },
      scss_plugins: {
        options: {
          banner:
            scss_imports.join("\n") + grunt.util.linefeed + grunt.util.linefeed,
        },
        files: {
          "dist/scss/selectize.scss": ["dist/scss/selectize.scss"],
        },
      }      
    },
    connect: {
      keepalive: true,
    },
    uglify: {
      main: {
        options: {
          banner:
            "/*! selectize.js - v<%= pkg.version %> | https://github.com/selectize/selectize.js | Apache License (v2) */\n",
          report: "gzip",
          "ascii-only": true,
        },
        files: {
          "dist/js/selectize.min.js": ["dist/js/selectize.js"],
          "dist/js/standalone/selectize.min.js": [
            "dist/js/standalone/selectize.js",
          ],
        },
      },
    },
    watch: {
      files: ["src/**/*.js"],
      tasks: ["concat:js", "build_standalone"],
    },
  });
};
