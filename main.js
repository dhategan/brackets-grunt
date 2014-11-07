/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, log , Mustache */


define(function (require, exports, module) {
    "use strict";

    var CommandManager = brackets.getModule("command/CommandManager"),
		KeyBindingManager = brackets.getModule("command/KeyBindingManager"),
        Menus          = brackets.getModule("command/Menus"),
		PanelManager = brackets.getModule("view/PanelManager"),
		ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
		AppInit = brackets.getModule("utils/AppInit"),
		NodeDomain = brackets.getModule("utils/NodeDomain"),
        PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
		ProjectManager = brackets.getModule("project/ProjectManager"),
		DocumentManager = brackets.getModule("document/DocumentManager"),
		StringUtils = brackets.getModule("utils/StringUtils"),
		Dialogs = brackets.getModule("widgets/Dialogs");
	
	var panelHtml = require("text!panel/panel.html");
	var prefDialogHtml = require("text!panel/preferences.html");
	var panel;
	var $icon = $("<a id='grunt-toolbar-icon' href='#'> </a>")
			.attr("title", "Grunt")
            .appendTo($("#main-toolbar .buttons"));
	var $console;
	var taskTemplate =  require("text!panel/task-list-template.html");
	var gruntDomain = new NodeDomain("grunt", ExtensionUtils.getModulePath(module, "node/GruntDomain"));
	var preferencePrefix = "brackets-grunt.";
    var pathSettingName = "brackets-grunt.-path";
    var path = "";
	var onsaveSettingName = "brackets-grunt.-onsaveTask";
	var onsaveTask = "";
	var RUN_DEFAULT_ID = "brackets-grunt.rundefault";
	
	
		
	function getKeyBinding(id) {
		var bindings = KeyBindingManager.getKeyBindings(id);
		
		if (bindings.length > 0) {
			return bindings[0].key;
		}
		
		return "";
	}
	
	function togglePanel() {
        if (panel.isVisible()) {
            panel.hide();
        } else {
            panel.show();
        }
    }
    
    function clearConsole() {
		panel.$panel.find("#grunt-console").empty();
	}
    
    function log(msg) {
		if (!msg) {
			return;
		}
		$console.append(msg.replace(/\n/g, "<br>"));
		$console.scrollTop($console.prop("scrollHeight"));
		//console.log(msg);
	}

	function getTasks() {
			
		var key = getKeyBinding(RUN_DEFAULT_ID);
		
		panel.$panel.find(".grunt-loader").removeClass("grunt-hide");
		$icon.addClass("on");
		
		log("Loading tasks from file<br>");
		
		gruntDomain.exec("getTasks", ProjectManager.getProjectRoot().fullPath + path)
			.done(function (tasks) {
				panel.$panel.find("#tasks").html(Mustache.render(taskTemplate, {tasks: tasks, defaultkey: key}));
				panel.$panel.find(".grunt-loader").addClass("grunt-hide");
				$icon.removeClass("on");
				if (tasks) {
					log("Load complete!<br>");
				}
			}).fail(function (err) {
				console.error("[Grunt] Error getting tasks", err);
				panel.$panel.find(".grunt-loader").addClass("grunt-hide");
				$icon.removeClass("on");
				log("Load error!");
			});
	}

	

	function runTask(taskName) {
		
		panel.$panel.find(".grunt-runner").removeClass("grunt-hide").html("Running '" + (taskName || 'default') + "' ( <div id='kill-btn' class='btn small'>kill</div> )");
		$icon.addClass("on");
        
		gruntDomain.exec("runTask", taskName, ProjectManager.getProjectRoot().fullPath + path, ExtensionUtils.getModulePath(module))
			.done(function (msg) {
                panel.$panel.find(".grunt-runner").addClass("grunt-hide");
                $icon.removeClass("on");
                log("###<br><br>");
			}).fail(function (err) {
                panel.$panel.find(".grunt-runner").addClass("grunt-hide");
                $icon.removeClass("on");
                log("###<br><br>");
			});
	}
	
	function killTask(clear) {
		gruntDomain.exec("killTask")
			.done(function (msg) {
				$icon.removeClass("on");
				panel.$panel.find(".grunt-runner").addClass("grunt-hide");
				if (msg) {
					log("###<br>");
				}
				if (clear) {
					clearConsole();
				}
			}).fail(function (err) {
				log("Error killing task: " + err);
			});
	}
	
	
    function loadProjectSettings(projectName) {
        pathSettingName = "brackets-grunt." + projectName + "-path";
        path = (PreferencesManager.get(pathSettingName) || "");
        panel.$panel.find("#path").val(path);
		
		onsaveSettingName = "brackets-grunt." + projectName + "-onsaveTask";
		onsaveTask = (PreferencesManager.get(onsaveSettingName) || "");
    }
	
	function showOptions() {
	
		var options = {
			'Strings' : {
				'title' : StringUtils.format('Grunt options for: {0}', ProjectManager.getProjectRoot().name),
				'path' : 'Path to gruntfile (relative to project)',
				'onsaveTask' : 'Task to execute on save (optional)'
			},
			'Preferences' : {
				'path' : (PreferencesManager.get(pathSettingName) || ""),
				'onsaveTask' : (PreferencesManager.get(onsaveSettingName) || "")
			}
		};
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(prefDialogHtml, options));
		dialog.done(function(buttonID) {
			if (buttonID == "ok") {
				{
				var prefInputs = dialog.getElement().find(".pref-input");
				
				var projectName = ProjectManager.getProjectRoot().name;
				var prefPrefix = preferencePrefix + projectName + "-";
				
				prefInputs.each(function() {
					var $this = $(this);
					var prefName = $this.attr("name");
					var val = $this.val();
					
					if (prefName)
						PreferencesManager.set(prefPrefix + prefName, val || "");
				});

				loadProjectSettings(projectName);
				getTasks();
				}
			}
		});
	}

	AppInit.appReady(function () {
		
		ExtensionUtils.loadStyleSheet(module, "style/style.css");
		panel = PanelManager.createBottomPanel("grunt.panel", $(panelHtml), 100);
		$console = panel.$panel.find("#grunt-console");
        
        loadProjectSettings(ProjectManager.getProjectRoot().name);
        
		// Panel Event Handlers 
		panel.$panel.on("click", ".task", function (e) {
			runTask(e.currentTarget.getAttribute("task-name"));
		});
		panel.$panel.on("click", "#refresh", function () {
            path = panel.$panel.find("#path").val();
            if (pathSettingName && path) {
                PreferencesManager.set(pathSettingName, path);
            }
			getTasks();
		});
        panel.$panel.on("click", "#clear-console", function () { clearConsole(); });
        panel.$panel.on("click", "#close", function () { togglePanel(); });
		panel.$panel.on("click", "#kill-btn", function (e) {
			killTask();
		});
		panel.$panel.on("click", "#show-options", function() { showOptions(); });
		
		$icon.on("click", togglePanel);
		
		//run-default-task key shortcut
		CommandManager.register("Run Default", RUN_DEFAULT_ID, runTask);
		//Don't bind if it the shortcut is already taken 
		//TODO: Ask the user for another shortcut
		if (!KeyBindingManager.getKeymap()["Ctrl-Alt-D"]) {
			KeyBindingManager.addBinding(RUN_DEFAULT_ID, {"key": "Ctrl-Alt-D"});
		}
		 
		//Handle messages from Node domain 
		$(gruntDomain).on("change", function (event, data) {
			log(data);
		});
		
		//Kill running task when Brackets is closed 
		$(ProjectManager).on('beforeAppClose', function () {
            killTask();
		});
		
		//Kill running task when project is changed
		$(ProjectManager).on('beforeProjectClose', function () {
			killTask(true);
		});

		$(ProjectManager).on("projectOpen", function (e, projectRoot) {
			loadProjectSettings(projectRoot.name);
			getTasks();
		});
		
		$(DocumentManager).on("documentSaved", function(e, doc) {
			if (onsaveTask)
				runTask(onsaveTask);
		});
		
		//Load tasks
		getTasks();
 
    });
});