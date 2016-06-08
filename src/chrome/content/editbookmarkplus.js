'use strict';
var editBookmarkPlus = {
	prefService: null,
	stringBundle: null,  
	isShownFirstTime: true,

	handleWindowLoad: function(evt) {
		window.removeEventListener('load', editBookmarkPlus.handleWindowLoad, false);
		window.setTimeout(function() { editBookmarkPlus.init(); }, 500); 
	},

	init: function() {
		// initialize prefService reference
		this.prefService = Components.classes['@mozilla.org/preferences-service;1']
							.getService(Components.interfaces.nsIPrefService)
							.getBranch('extensions.editbookmarkplus.');

		this.stringBundle =	Components.classes['@mozilla.org/intl/stringbundle;1']  
						        .getService(Components.interfaces.nsIStringBundleService)  
						        .createBundle('chrome://edit-bookmark-plus/locale/editbookmarkplus.properties');

        this._handleStartup();
		
		var p =  document.getElementById('editBookmarkPanel');
		if (p) {
			
			// StarUI._doShowEditBookmarkPanel passes a hard coded array of hidden elements 
			// to gEditItemOverlay.initPanel
			// Backup the original function
			gEditItemOverlay.initPanel2 = gEditItemOverlay.initPanel;

			// Set a wrapper to original function that will hide/show location/description fields
			gEditItemOverlay.initPanel = function(aFor, aInfo) {

					var hiddenRows = null;

					if (aInfo && aInfo.hasOwnProperty('hiddenRows')) {
						hiddenRows = aInfo.hiddenRows;
					}
					else if (aFor && aFor.hasOwnProperty('hiddenRows')) {
						hiddenRows = aFor.hiddenRows;
					}


					if (hiddenRows) {
						var fieldsToShow = [];
						if (editBookmarkPlus.prefService.getBoolPref('showLocation'))
							fieldsToShow.push('location');
						if (editBookmarkPlus.prefService.getBoolPref('showDescription'))
							fieldsToShow.push('description');
						if (editBookmarkPlus.prefService.getBoolPref('showKeyword'))
							fieldsToShow.push('keyword');

						for each(var field in fieldsToShow) {
							var index = hiddenRows.indexOf(field);
							if (index !== -1) {
							    hiddenRows.splice(index, 1);
							}
						}
					}

					gEditItemOverlay.initPanel2(aFor, aInfo);
				}

			p.addEventListener('load', this.handlePopupLoad, false);
			p.addEventListener('popupshown', this.handlePopupShown, false);
			p.addEventListener('popupshowing', editBookmarkPlus.handlePopupShowing, false);
			p.addEventListener('popuphidden', this.handlePopupHidden, false);
			
			
			p = document.getElementById('placesContext');
			p.addEventListener('popupshowing', this.handleContextMenuShowing, false);
		}
		else {
			/*
			//None of the following works
			window.addEventListener('dialogcancel', this.handleDialogUnload, false);
			window.addEventListener('beforeunload', this.handleDialogUnload, false);
			window.addEventListener('unload', this.handleDialogUnload, false);
			window.addEventListener('close', this.handleDialogUnload, false);
			window.addEventListener('DOMModalDialogClosed', this.handleDialogUnload, false);
			window.addEventListener('DOMWindowClose', this.handleDialogUnload, false);
			*/

			this.handlePopupLoad(null);
			this._processShown(null);
		}
	},

	_handleStartup: function() {
		var oldVersion = '__version__';
		var currVersion = '__version__';

		try {
			oldVersion = this.prefService.getCharPref('version');
		}
		catch(e) {}
		
		if (oldVersion != currVersion) {
			this.prefService.setCharPref('version', currVersion);
			try {
				setTimeout(editBookmarkPlus._welcome,100,currVersion);
			}
			catch(e) {}
		}
	},
	
	_welcome: function(version) {
	/*
			try {
			var url = 'http://www.kashiif.com/firefox-extensions/edit-bookmark-plus/edit-bookmark-plus-welcome/?v='+version;
			openUILinkIn( url, 'tab');
		} 
		catch(e) {}

	*/

	},
	
	handlePopupLoad: function(evt) {		
		var folderTreeRow = document.getElementById('editBMPanel_folderTreeRow');
		folderTreeRow.flex=10;
		folderTreeRow.align='';

                var tagsSelectorRow = document.getElementById('editBMPanel_tagsSelectorRow');
                tagsSelectorRow.flex=20;
                tagsSelectorRow.height='';
                tagsSelectorRow.align='';

		var btnExpandFolder = document.getElementById('editBMPanel_foldersExpander');
		btnExpandFolder.addEventListener('command', editBookmarkPlus.handleExpandFolderButtonClick, false);
		
		var folderMenuList = document.getElementById('editBMPanel_folderMenuList');
		folderMenuList.addEventListener('command', editBookmarkPlus.handleTreeSelectionChanged, false);

		var p = document.getElementById('hboxEditBookmarkPlus');
		if (p) {
			// Skip for bm-props2.xul
			var parent = p.parentNode;
			parent.removeChild(p);
			// Sea Monkey: insert the 'Resizer Panel' as the first item in BottomButtonsPanel
			parent.insertBefore(p, parent.children.item(0));
			
			p =  document.getElementById('editBookmarkPanel');
			p.removeEventListener('load', editBookmarkPlus.handlePopupLoad, false);
			editBookmarkPlus.__setNoAutoHide(p);

			var resizer = document.getElementById('resizerEditBookmarkPlus');
			resizer.addEventListener('command', editBookmarkPlus.handleResizerCommand, false);
		}
		
	},

	__setNoAutoHide: function(targetPanel) {
		var noautohide = editBookmarkPlus.prefService.getBoolPref('noAutoHidePanel');
		if (noautohide) {
			targetPanel.setAttribute('noautohide', true);
		}
		else {
			targetPanel.removeAttribute('noautohide', noautohide);	
		}
	},

	handlePopupShowing: function(evt) {
		if (evt.target.id != 'editBookmarkPanel') return;

		var panel = evt.target;

		//panel.removeEventListener('popupshowing', editBookmarkPlus.handlePopupShowing);
		editBookmarkPlus.__setNoAutoHide(panel);
	},

	
	handlePopupShown: function(evt) {
		// Do not handle drop-down popup events
		if (evt.target.id != 'editBookmarkPanel') return;
		//editBookmarkPlus.__setNoAutoHide(evt.target);

		window.setTimeout(function() {
			editBookmarkPlus._processShown(evt);
		}, editBookmarkPlus.prefService.getIntPref('popupshowndelay'));
	},
	
	handlePopupHidden: function(evt) {
		var target = document.getElementById('editBookmarkPanelContent'),
				prefService = editBookmarkPlus.prefService,
				prefAutoExpandTree = prefService.getBoolPref('autoExpandTree');	

		prefService.setIntPref('popupWidth', target.width);

		if (prefAutoExpandTree) {
			// Only save height if tree was 
			prefService.setIntPref('popupHeight', target.height);
		}
	},

	_processShown: function(evt) {

		var folderTreeRow = document.getElementById('editBMPanel_folderTreeRow'),
				btnExpandFolder, txtBookmarkName,
				prefService = editBookmarkPlus.prefService,
				prefAutoExpandTree = prefService.getBoolPref('autoExpandTree');	

		folderTreeRow.flex=10;
		folderTreeRow.align='';

		if (prefAutoExpandTree) {
			btnExpandFolder = document.getElementById('editBMPanel_foldersExpander');
			if (btnExpandFolder.className == 'expander-down') {
				btnExpandFolder.click();
				// Since click event handler is added AFTER popupshown event, 
				// hence scroll tree to show the selected row

				if (this.isShownFirstTime) {
					this.handleExpandFolderButtonClick(null);
					this.isShownFirstTime = false;
				}
			}
		}
                if (prefService.getBoolPref('autoExpandTags')) {
			var btnExpandFolder = document.getElementById('editBMPanel_tagsSelectorExpander');
			if (btnExpandFolder.className == 'expander-down') {
				btnExpandFolder.click();
				// Since click event handler is added AFTER popupshown event,
				// hence scroll tree to show the selected row
				
				if (this.isShownFirstTime) {
					this.handleExpandFolderButtonClick(null);
					this.isShownFirstTime = false;
				}

				// clicking the button moves focus from name textbox, move the focus back
				txtBookmarkName = document.getElementById('editBMPanel_namePicker');
				txtBookmarkName.focus();
				txtBookmarkName.select();

			}
		}

		var p = document.getElementById('editBookmarkPanelContent');

		if (evt) {
			// prefrences key for popup

			// if width,height persisted, popup shows up in that size even after uninstalling addon
			// without the tree being expanded
			// p.persist='width height';
			var t = editBookmarkPlus.prefService.getIntPref('popupWidth');
			if (t>0) {
				p.width = t;
			}

			if (autoExpandTree) {
				// Only restore height if the tree is auto expanded
				t = editBookmarkPlus.prefService.getIntPref('popupHeight');
				if (t>0) {
					p.height = t;
				}
			}

		}

		p.style.minWidth = '30.75em'; // Corresponds to 492px for base Size=16pt
		p.flex = '1';
	},

	handleExpandFolderButtonClick: function(evt) {
                var tagsSelectorRow = document.getElementById('editBMPanel_tagsSelectorRow');
                tagsSelectorRow.flex=20;
                tagsSelectorRow.height='';

                var folderTreeRow = document.getElementById('editBMPanel_folderTreeRow');
		var p =  document.getElementById('editBookmarkPanel');

		if (folderTreeRow.collapsed) {
			var tree = document.getElementById('editBMPanel_folderTree');
			if (p) {
				// Skip for bm-props2.xul
				// collapse panel when collapse button is clicked
				p.height = p.height-tree.height;
			}
		}
		else {
			var tree = document.getElementById('editBMPanel_folderTree');
			if (tree.flex != '1') {
				tree.flex = '1';
				tree.style.minHeight = '9.375em'; // Corresponds to 150px for base Size=16pt
			}

			if (p) {
				// Skip for bm-props2.xul
				p.height = '';
				p.flex = 1;
			}
		}

                var tagsSelectorRow = document.getElementById('editBMPanel_tagsSelectorRow');
		var p =  document.getElementById('editBookmarkPanel');

		if (tagsSelectorRow.collapsed) {
			var tree = document.getElementById('editBMPanel_tagsSelector');
			if (p) {
				// Skip for bm-props2.xul
				// collapse panel when collapse button is clicked
				p.height = p.height-tree.height;
			}
		}
		else {
			var tree = document.getElementById('editBMPanel_tagsSelector');
			if (tree.flex != '1') {
				tree.flex = '1';
				tree.style.minHeight = '9.375em'; // Corresponds to 150px for base Size=16pt
			}

			if (p) {
				// Skip for bm-props2.xul
				p.height = '';
				p.flex = 1;
			}
		}

		editBookmarkPlus._ensureSelectionVisible();
	},
	
	handleTreeSelectionChanged: function(evt) {
		editBookmarkPlus._ensureSelectionVisible();
	},
	
	handleResizerCommand: function(evt) {
		if (evt.target.id == 'resizerEditBookmarkPlus') {
			editBookmarkPlus._ensureSelectionVisible();
		}
	},

	_ensureSelectionVisible: function ()	{
		var tree = document.getElementById('editBMPanel_folderTree');
		
		if (!tree.hidden) {
			var numRanges = tree.view.selection.getRangeCount();
			if (numRanges > 0) {
				var start = new Object();
				var end = new Object();
				tree.view.selection.getRangeAt(0,start,end);
				tree.treeBoxObject.ensureRowIsVisible(start.value);
			}
		}

		var tree = document.getElementById('editBMPanel_tagsSelector');

		if (!tree.hidden) {
			var numRanges = tree.view.selection.getRangeCount();
			if (numRanges > 0) {
				var start = new Object();
				var end = new Object();
				tree.view.selection.getRangeAt(0,start,end);
				tree.treeBoxObject.ensureRowIsVisible(start.value);
			}
		}
	},

	_updatePlacesEntry: function(placesNode, option) {
		if (placesNode && PlacesUtils.nodeIsBookmark(placesNode)) {
			switch(option) {
				case 'title':
					editBookmarkPlus._updateTitleCore(placesNode);
					break;
				case 'url':
					editBookmarkPlus._updateUrlCore(placesNode);
					break;
			}
		}
	},
	
	updateFromSidebar: function(e, option) {
		var thePopupNode = e.target.ownerDocument.popupNode;

		var v = thePopupNode.parentNode.view;
		if (v) {
			var _node = v.nodeForTreeIndex(v.selection.currentIndex);
			editBookmarkPlus._updatePlacesEntry(_node, option);
		}
	},
	
	updateFromMain: function(e, option) {
		var _node = document.popupNode._placesNode;
		editBookmarkPlus._updatePlacesEntry(_node, option);
	},
	
	_updateTitleCore: function (placesNode) {
		var activeContent = top.window.document.getElementById('content');
		var activeBrowser = activeContent.selectedBrowser;
		var newValue = activeBrowser.contentTitle;
		try {
			PlacesUtils.bookmarks.setItemTitle(placesNode.itemId, newValue);
		}
		catch (ex) { alert('EditBookmarkPlus: ' + ex.message); }
	},
	
	_updateUrlCore: function (placesNode) {
		var activeContent = top.window.document.getElementById('content');
		var activeBrowser = activeContent.selectedBrowser;
		var newValue = activeBrowser.currentURI.spec;
		
		try {
			var oldURI = PlacesUtils.bookmarks.getBookmarkURI(placesNode.itemId);
			var newURI = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService).newURI(newValue, null, null);

			// add old tags onto new uri
			var oldValueTags = PlacesUtils.tagging.getTagsForURI(oldURI, {});
			PlacesUtils.tagging.tagURI(newURI, oldValueTags);

			PlacesUtils.bookmarks.changeBookmarkURI(placesNode.itemId, newURI);
		}
		catch (ex) { alert('EditBookmarkPlus: ' + ex.message); }
	},
		
	handleContextMenuShowing: function(evt) {
		/**
		* Event handler for placesContext popupshowing event on bookmarks toolbar and bookmarks menu.
		*/
		var parent = evt.target.triggerNode;

		do {
			if 	( parent.tagName == 'toolbarbutton' 
				|| parent.id == 'bookmarksMenuPopup'
				|| parent.id == 'appmenu_bookmarksPopup') {
			
				break;
			}
			parent = parent.parentNode;
		} while (parent);

		// if clicked on bookmark toolbar, parent would be null
		if (parent == null) {
			var ids = ['ebmp-placesContext-separator', 'ebmp-placesContext-updatetitle-menuitem','ebmp-placesContext-updateurl-menuitem']

			for(var i=0 ; i<ids.length ; i++) {
				var m = document.getElementById(ids[i]);
				if (m) m.hidden = true;
			}
			return true;
		}


		var context = {
			menuSeparator: {
				id: 'ebmp-placesContext-separator',
			},
			menuTitle: {
				id: 'ebmp-placesContext-updatetitle-menuitem',
				command: 'editBookmarkPlus.updateFromMain(event, \'title\');'
			},
			menuUrl: {
				id: 'ebmp-placesContext-updateurl-menuitem',
				command: 'editBookmarkPlus.updateFromMain(event, \'url\');'
			},			
		};
		
		if (parent.tagName == 'toolbarbutton') {
			context.menuTitle.prefkey = 'updateTitleOnToolbar';
			context.menuUrl.prefkey   = 'updateUrlOnToolbar';
		}
		else {
			context.menuTitle.prefkey = 'updateTitleOnMenu';
			context.menuUrl.prefkey   = 'updateUrlOnMenu';
		}
		
		return editBookmarkPlus.handleContextMenuShowingCore(evt, context);
	},

	handleContextMenuShowingCore: function(evt, context) {
		/**
		* Updates if appropriate context menu are present and visible as per options dialog.
		* This function is called by event handlers of bookmarks toolbar, bookmarks menu and
		* sidebar popupshowing event.
		*
		*
		* context object should have following properties.
		*   doc - document object
		*   menuSeparator - object having attribute id of separator menu item
		*   menuTitle - object having attribute id, command, prefkey  
		*   menuUrl - object having attribute id, command, prefkey  
		*/

		if (evt.target.id != 'placesContext') {
			return true;
		}

		var placesContext = evt.target;
		var doc = evt.target.ownerDocument;

		//Components.utils.import('resource://gre/modules/PlacesUtils.jsm');
		var selectedNode = PlacesUIUtils.getViewForNode(doc.popupNode).selectedNode;
		// ref chrome://browser/content/places/placesOverlay.xul, placesContext, onpopupshowing : this._view = PlacesUIUtils.getViewForNode(document.popupNode)
		// ref chrome://browser/content/places/controller.js, showBookmarkPropertiesForSelection() : var node = this._view.selectedNode;

		var elementMenuSeparator = doc.getElementById(context.menuSeparator.id);
		var elementUpdateTitle = doc.getElementById(context.menuTitle.id);
		var elementUpdateUrl = doc.getElementById(context.menuUrl.id);

		var showUpdateTitle = false;
		var showUpdateUrl = false;

		var updateItemsVisibility = true;

		if (selectedNode) {	// Proceed only when single node selected

			if (PlacesUtils.nodeIsBookmark(selectedNode)) {	 
				
				var prefService = this.prefService;
				showUpdateTitle = prefService.getBoolPref(context.menuTitle.prefkey);
				showUpdateUrl = prefService.getBoolPref(context.menuUrl.prefkey);

				context.menuTitle.label = this.stringBundle.GetStringFromName('updatetitle.label');
				context.menuUrl.label = this.stringBundle.GetStringFromName('updateurl.label');

				var result = this._createItemIfRequired(showUpdateTitle, doc, elementUpdateTitle, context.menuTitle);
				elementUpdateTitle = result.menuitem;
				var appendUpdateTitle = result.isNew;

				result = this._createItemIfRequired(showUpdateUrl, doc, elementUpdateUrl, context.menuUrl);
				elementUpdateUrl = result.menuitem;
				var appendUpdateUrl = result.isNew;


				if (elementUpdateUrl || elementUpdateTitle) {
					if (!elementMenuSeparator) {
						elementMenuSeparator = doc.createElement('menuseparator');
						elementMenuSeparator.id = context.menuSeparator.id;
						placesContext.appendChild(elementMenuSeparator);
						updateItemsVisibility = false;
					}

					if (appendUpdateTitle) {
						placesContext.appendChild(elementUpdateTitle);
					}

					if (appendUpdateUrl) {
						placesContext.appendChild(elementUpdateUrl);
					}

				}
				else {
					// None of the context menu should be displayed
					showUpdateTitle = false;
					showUpdateUrl = false;
				}
			}
		}

		if (updateItemsVisibility) {
			if (elementMenuSeparator) {
				elementMenuSeparator.hidden = !(showUpdateUrl || showUpdateTitle);
			}

			if (elementUpdateTitle) {
				elementUpdateTitle.hidden = !showUpdateTitle;
			}
			if (elementUpdateUrl) {
				elementUpdateUrl.hidden = !showUpdateUrl;
			}
		}

		return true;
	},

	_createItemIfRequired: function(showItem, doc, item, menuSpecs) {
		var created = false;
		if (showItem) {
			if (item) {
			}
			else {
				item = doc.createElement('menuitem');
				item.id = menuSpecs.id;
				item.setAttribute('oncommand', menuSpecs.command);
				item.setAttribute('label',  menuSpecs.label);
				created = true;
			}
		}
		return { menuitem:item, isNew:created };
	},

};
window.addEventListener
(
  'load', 
  editBookmarkPlus.handleWindowLoad, 
  false
);
