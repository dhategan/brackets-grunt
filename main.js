/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, log , Mustache */


define(function (require, exports, module) {
    "use strict";

    var CommandManager = brackets.getModule("command/CommandManager"),
        Menus          = brackets.getModule("command/Menus"),
		PanelManager = brackets.getModule("view/PanelManager"),
		ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
		AppInit = brackets.getModule("utils/AppInit"),
		NodeDomain = brackets.getModule("utils/NodeDomain"),
        PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
		ProjectManager = brackets.getModule("project/ProjectManager");

		
	
	//var menu = Menus.addMenu("Grunt", "neuromaster.menu.grunt");
	var panelHtml = require("text!panel/panel.html");
	var panel;
	var $icon                  = $("<a id='grunt-toolbar-icon' href='#'> </a>")
                                    .attr("title", "Grunt")
                                    .appendTo($("#main-toolbar .buttons"));
	
	
	var taskTemplate =  require("text!panel/task-list-template.html");	
	var gruntDomain = new NodeDomain("grunt", ExtensionUtils.getModulePath(module, "node/GruntDomain"));
	
    var pathSettingName = "brackets-grunt.-path";
    var path = "";    
	
	function togglePanel() {
		
        if (panel.isVisible()) {
            panel.hide();
			$icon.removeClass("on");
        } else {
            panel.show();
			$icon.addClass("on");            
        }
    }
	
	function getTasks() {
		panel.$panel.find(".grunt-loader").removeClass("grunt-hide");
		gruntDomain.exec("getTasks", ProjectManager.getProjectRoot().fullPath + path)
			.done(function (tasks) {
				panel.$panel.find("#tasks").html(Mustache.render(taskTemplate, {tasks: tasks}));
				panel.$panel.find(".grunt-loader").addClass("grunt-hide");
			}).fail(function (err) {
				console.error("[Grunt] Error getting tasks", err);
				panel.$panel.find(".grunt-loader").addClass("grunt-hide");
			});
	}

	

	function runTask(taskName) {
		panel.$panel.find(".grunt-runner").removeClass("grunt-hide").html("Running '" + taskName + "' ( <div id='kill-btn' class='btn small'>kill</div> )");
		gruntDomain.exec("runTask", taskName, ProjectManager.getProjectRoot().fullPath + path, ExtensionUtils.getModulePath(module))
			.done(function (msg) {
					panel.$panel.find(".grunt-runner").addClass("grunt-hide");
					log("###<br><br>");
			}).fail(function (err) {
					panel.$panel.find(".grunt-runner").addClass("grunt-hide");
					log("###<br><br>");
			});
	}
	
	function killTask() {
		gruntDomain.exec("killTask")
			.done(function (msg) {
				//console.log(msg);
			}).fail(function (err) {
				console.error('GRUNT ERROR', err);
			});
	}
	
	function log( msg ) {
		if(!msg) {
			return;
		}
		var $console = panel.$panel.find("#grunt-console");
		$console.append(msg.replace(/\n/g, "<br>" ));
		
		$console.scrollTop($console.prop("scrollHeight"));
		
		console.log(msg);
	}
	
    function loadPathSettings(projectName)
    {
        pathSettingName = "brackets-grunt." + projectName + "-path";
        path = (PreferencesManager.get(pathSettingName) || "");
        panel.$panel.find("#path").val(path);
    }



	AppInit.appReady(function () {	
		
        
		ExtensionUtils.loadStyleSheet(module, "style/style.css");       
        		
		$(ProjectManager).on('beforeAppClose', function () {
			killTask();
		});        
        
        $(ProjectManager).on("projectOpen", function (e, projectRoot) { loadPathSettings(projectRoot.name); });
		
		panel = PanelManager.createBottomPanel("grunt.panel", $(panelHtml), 100);
        
        loadPathSettings(ProjectManager.getProjectRoot().name);
        
		panel.$panel.on("click", ".task", function (e) {
			runTask(e.currentTarget.getAttribute("task-name"));
		});   
        
		panel.$panel.on("click", "#refresh", function () 
        {
            path = panel.$panel.find("#path").val();
            if (pathSettingName && path)
            {
                PreferencesManager.set(pathSettingName, path);
            }
			getTasks();
		});
        panel.$panel.on("click", "#clear-console", function () { panel.$panel.find("#grunt-console").empty(); });
        panel.$panel.on("click", "#close", function () { togglePanel(); });
		
		panel.$panel.on("click", "#kill-btn", function (e) {
			killTask();
		});
		
		$icon.on("click", togglePanel);
		
		getTasks();
		
		$(gruntDomain).on("change", function (event, data) {
			log(data);
		});
 
    });
});