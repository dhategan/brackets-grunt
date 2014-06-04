/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, log , Mustache */


define(function (require, exports, module) {
    "use strict";

    var CommandManager = brackets.getModule("command/CommandManager"),
        Menus          = brackets.getModule("command/Menus"),
		PanelManager = brackets.getModule("view/PanelManager"),
		ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
		AppInit = brackets.getModule("utils/AppInit"),
		NodeDomain = brackets.getModule("utils/NodeDomain"),
		ProjectManager = brackets.getModule("project/ProjectManager");

		
	
	//var menu = Menus.addMenu("Grunt", "neuromaster.menu.grunt");
	var panelHtml = require("text!panel/panel.html");
	var panel;
	var $icon                  = $("<a id='grunt-toolbar-icon' href='#'> </a>")
                                    .attr("title", "Grunt")
                                    .appendTo($("#main-toolbar .buttons"));
	
	
	var taskTemplate =  require("text!panel/task-list-template.html");
	
	var gruntDomain = new NodeDomain("grunt", ExtensionUtils.getModulePath(module, "node/GruntDomain"));
	
	
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
		gruntDomain.exec("getTasks", ProjectManager.getProjectRoot().fullPath)
			.done(function (tasks) {
				//togglePanel();
				panel.$panel.find("#tasks").html(Mustache.render(taskTemplate, {tasks: tasks}));
			}).fail(function (err) {
				console.error("[brackets-simple-node] failed to run simple.getMemory", err);
			});
	}
	

	function runTask(taskName) {
		
		gruntDomain.exec("runTask", taskName, ProjectManager.getProjectRoot().fullPath)
			.done(function (msg) {
				//console.log(msg);
			}).fail(function (err) {
				console.error('GRUNT ERROR', err);
			});
	}



	AppInit.appReady(function () {
		
		
		ExtensionUtils.loadStyleSheet(module, "style/style.css");
		
		panel = PanelManager.createBottomPanel("grunt.panel", $(panelHtml), 100);
		panel.$panel.on("click", ".task", function (e) {
			
			runTask(e.currentTarget.getAttribute("task-name"));
		});
		
		panel.$panel.on("click", "#refresh", function (e) {
			getTasks();
		});
		
		$icon.on("click", togglePanel);
		
		getTasks();
		
		$(gruntDomain).on("change", function (event, data) {
			console.log(data.replace(/^\n|\n$/g, ""));
		});
 
    });
});