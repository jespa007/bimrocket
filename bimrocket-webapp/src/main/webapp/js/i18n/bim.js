/**
 * bim.js
 *
 * @author realor
 */

export const translations =
{
  "button.show_all" : "Show all",
  "button.explore_selection" : "Explore selection",

  "tool.bim_inventory.label" : "BIM inventory",
  "tool.bim_inventory.help" : "BIM inventory setup",

  "tool.bim_layout.label" : "BIM layout",
  "tool.bim_layout.help" : "Shows BIM layout",

  "tool.bim_inspector.label" : "BIM inspector",
  "tool.bim_inspector.help" : "Shows BIM data",

  "tool.bcf.label" : "BCF",
  "tool.bcf.help" : "Manage BCF topics",

  "tab.comments" : "Comments",
  "tab.viewpoints" : "Viewpoints",
  "tab.links" : "Links",
  "tab.audit" : "Audit",

  "tab.types" : "Types",
  "tab.classifications" : "Classifications",
  "tab.groups" : "Groups",
  "tab.layers" : "Layers",

  "label.bcf_service" : "BCF service:",
  "label.project" : "Project:",
  "label.status" : "Status:",
  "label.priority" : "Priority:",
  "label.assigned_to" : "Assigned to:",
  "label.index" : "Index:",
  "label.title" : "Title:",
  "label.type" : "Type:",
  "label.stage" : "Stage:",
  "label.due_date" : "Due date:",
  "label.description" : "Description:",
  "label.creation_date" : "Creation date:",
  "label.creation_author" : "Creation author:",
  "label.modify_date" : "Modify date:",
  "label.modify_author" : "Modify author:",
  "label.project_name" : "Project name:",
  "label.project_extensions" : "Project extensions:",
  "label.comment" : "Comment:",
  "label.zoom_image" : "Zoom image",

  "col.index" : "Idx.",
  "col.topic" : "Topic",
  "col.status" : "Status",

  "title.delete_topic" : "Delete topic",
  "title.delete_comment" : "Delete comment",
  "title.delete_viewpoint" : "Delete viewpoint",
  "title.delete_bcf_service" : "Delete BCF service",
  "title.viewpoint" : "Topic viewpoint",

  "message.no_bim_object_selected" : "No BIM object selected.",

  "message.viewpoint" : (index, type) => `Viewpoint ${index} ${type}`,

  "message.topic_saved" : "Topic saved.",
  "message.topic_deleted" : "Topic deleted.",
  "message.comment_saved" : "Comment saved.",
  "message.comment_deleted" : "Comment deleted.",
  "message.viewpoint_saved" : "Viewpoint saved.",
  "message.viewpoint_deleted" : "Viewpoint deleted.",
  "message.project_saved" : "Project saved.",
  "message.project_extensions_saved" : "Project extensions saved.",

  "question.delete_topic" : "Do you want to delete this topic?",
  "question.delete_comment" : "Do you want to delete this comment?",
  "question.delete_viewpoint" : "Do you want to delete this viewpoint?",
  "question.delete_bcf_service" : name => `Do you want to delete the ${name} service?`
};
