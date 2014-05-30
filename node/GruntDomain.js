/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, log, require, exports, process */


(function () {
    "use strict";
    
    var os = require("os");
	var path = require('path');
	
	var domain;
	var cmd = null;
	
	
	
	require.uncache = function (moduleName) {
		// Run over the cache looking for the files
		// loaded by the specified module name
		require.searchCache(moduleName, function (mod) {
			delete require.cache[mod.id];
		});
	}


	require.searchCache = function (moduleName, callback) {
		// Resolve the module identified by the specified name
		var mod = require.resolve(moduleName);

		// Check if the module has been resolved and found within
		// the cache
		if (mod && ((mod = require.cache[mod]) !== undefined)) {
			// Recursively go over the results
			(function run(mod) {
				// Go over each of the module's children and
				// run over it
				mod.children.forEach(function (child) {
					run(child);
				});

				// Call the specified callback providing the
				// found module
				callback(mod);
			})(mod);
		}
	}

        
    function getTasks(path) {
		
		//reload grunt module 
		require.uncache('grunt');
		var grunt = require("grunt");
		
		grunt.option('gruntfile', path + "Gruntfile.js");
		grunt.task.init([]);
		
	
		var  _tasks = Object.keys(grunt.task._tasks).sort();
		return _tasks;
    }
	
	
	function runTask(task, path, callback) {
		
			
		if (cmd !== null) {
			
			var isWin = /^win/.test(process.platform);
			if (!isWin) {
				cmd.kill();
			} else {
				var cp = require('child_process');
				cp.exec('taskkill /PID ' + cmd.pid + ' /T /F');
			}


		}
		
		var exec = require('child_process').exec;
		process.chdir(path);
		cmd = exec("grunt --no-color " + task);
		
	
		
		cmd.stderr.on("data", function (err) {
			
			//callback(data);
			console.log(err);
		});
		cmd.stdout.on("data", function (data) {
			//callback(null, data);
			//console.log(data);
			
			domain.emitEvent("grunt", "change", [data]);
		});
	
    }
    
 
    function init(domainManager) {
        if (!domainManager.hasDomain("grunt")) {
            domainManager.registerDomain("grunt", {major: 0, minor: 1});
        }
		 
		domain = domainManager;
		
        domainManager.registerCommand(
            "grunt",
            "getTasks",
            getTasks,
            false
        );
		
		domainManager.registerCommand(
            "grunt",
            "runTask",
            runTask,
            true
        );
		
		domainManager.registerEvent(
			"grunt",
			"change",
			[
				{name: "data", type: "object"}
			
			]
		);
    }
	
    
    exports.init = init;
    
}());