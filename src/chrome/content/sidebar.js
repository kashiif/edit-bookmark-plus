'use strict';
var editBookmarkPlusSidebar = {
	onload: function(evt) {

		var placesContext = document.getElementById('placesContext');
		if (placesContext) {
			placesContext.addEventListener('popupshowing', editBookmarkPlusSidebar.handleContextMenuShowing, false);
		}

	},

	handleContextMenuShowing: function(evt) {

		var context = {
			menuSeparator: {
				id: 'ebmp-sidebar-placesContext-separator',
			},
			menuTitle: {
				id:'ebmp-sidebar-placesContext-updatetitle-menuitem',
				command: 'window.top.window.editBookmarkPlus.updateFromSidebar(event, \'title\');',
				prefkey: 'updateTitleOnSidebar',
			},
			menuUrl: {
				id: 'ebmp-sidebar-placesContext-updateurl-menuitem',
				command: 'window.top.window.editBookmarkPlus.updateFromSidebar(event, \'url\');',
				prefkey: 'updateUrlOnSidebar',				
			}
		};
		
		return window.top.window.editBookmarkPlus.handleContextMenuShowingCore(evt, context);
	},

	onunload: function(evt) {
		var placesContext = document.getElementById('placesContext');
		if (placesContext)
			placesContext.removeEventListener('popupshowing', editBookmarkPlusSidebar.handleContextMenuShowing, false);
		window.removeEventListener('load',   editBookmarkPlusSidebar.onload, false);
		window.removeEventListener('unload', editBookmarkPlusSidebar.onunload, false);
	},

	delayLoadEvent: function() {
		window.removeEventListener('DOMContentLoaded', editBookmarkPlusSidebar.delayLoadEvent, false);
		window.addEventListener('load',   editBookmarkPlusSidebar.onload, false);
		window.addEventListener('unload', editBookmarkPlusSidebar.onunload, false);
	}
}

window.addEventListener('DOMContentLoaded', editBookmarkPlusSidebar.delayLoadEvent, false);