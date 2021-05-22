/**
 * @author realor
 */
BIMROCKET.TabbedPane = class
{
  constructor(element)
  {
    this.tabs = new Map();

    this.paneElem = document.createElement("div");
    element.appendChild(this.paneElem);
    this.paneElem.className = "tabbed_pane";
    
    this.headerElem = document.createElement("div");
    this.headerElem.className = "header";
    this.paneElem.appendChild(this.headerElem);
    
    this.bodyElem = document.createElement("div");
    this.bodyElem.className = "body";
    this.paneElem.appendChild(this.bodyElem);
  }
  
  addTab(name, label)
  {
    if (!this.tabs.has(name))
    {
      const scope = this;
      const tabSelectorElem = document.createElement("a");
      tabSelectorElem.href = "#";
      tabSelectorElem.innerHTML = label || name;
      tabSelectorElem.addEventListener("click", () => scope.showTab(name));
      tabSelectorElem.addEventListener("mousedown", () => scope.showTab(name));
      tabSelectorElem.className = "selector";
      this.headerElem.appendChild(tabSelectorElem);
      
      const tabPanelElem = document.createElement("div");
      this.bodyElem.appendChild(tabPanelElem);
      tabPanelElem.className = "tab_panel";
      
      const tabElems = {
        "selector" : tabSelectorElem, 
        "panel" : tabPanelElem 
      };
      this.tabs.set(name, tabElems);
      if (this.tabs.size === 1) // first tab
      {
        this.selectTab(tabElems);
      }
      return tabElems.panel;
    }
    return null;
  }
  
  removeTab(name)
  {
    let tabElems = this.tabs.get(name);
    if (tabElems)
    {
      this.headerElem.removeChild(tabElems.selector);
      this.bodyElem.removeChild(tabElems.panel);
      this.tabs.delete(name);
      if (this.tabs.size > 0) // not empty
      {
        tabElems = this.tabs.values().next().value;
        this.selectTab(tabElems);
      }
    }
  }
  
  showTab(name)
  {
    let tabElems;
    
    for (tabElems of this.tabs.values())
    {
      this.unselectTab(tabElems);
    }
    
    tabElems = this.tabs.get(name);
    if (tabElems)
    {
      this.selectTab(tabElems);
    }
  }
  
  getTab(name)
  {
    return this.tabs.get(name);
  }

  setLabel(name, label)
  {
    let tabElems = this.tabs.get(name);
    if (tabElems)
    {
      tabElems.selector.innerHTML = label;    
    }
  }
  
  getLabel(name)
  {
    let tabElems = this.tabs.get(name);
    if (tabElems)
    {
      return tabElems.selector.innerHTML;    
    }
    return null;
  }
  
  selectTab(tabElems)
  {
    tabElems.selector.classList.add("selected");
    tabElems.panel.classList.add("selected");
  }

  unselectTab(tabElems)
  {
    tabElems.selector.classList.remove("selected");
    tabElems.panel.classList.remove("selected");
  }
};