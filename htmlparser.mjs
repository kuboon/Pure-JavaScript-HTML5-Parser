/*
 * HTML5 Parser By Sam Blowes
 *
 * Designed for HTML5 documents
 *
 * Original code by John Resig (ejohn.org)
 * http://ejohn.org/blog/pure-javascript-html-parser/
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
 * ----------------------------------------------------------------------------
 * License
 * ----------------------------------------------------------------------------
 *
 * This code is triple licensed using Apache Software License 2.0,
 * Mozilla Public License or GNU Public License
 * 
 * ////////////////////////////////////////////////////////////////////////////
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License.  You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 * 
 * ////////////////////////////////////////////////////////////////////////////
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Simple HTML Parser.
 * 
 * The Initial Developer of the Original Code is Erik Arvidsson.
 * Portions created by Erik Arvidssson are Copyright (C) 2004. All Rights
 * Reserved.
 * 
 * ////////////////////////////////////////////////////////////////////////////
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * ----------------------------------------------------------------------------
 * Usage
 * ----------------------------------------------------------------------------
 *
 * // Use like so:
 * HTMLParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * // or to get an XML string:
 * HTMLtoXML(htmlString);
 *
 * // or to get an XML DOM Document
 * HTMLtoDOM(htmlString);
 *
 * // or to inject into an existing document/DOM node
 * HTMLtoDOM(htmlString, document);
 * HTMLtoDOM(htmlString, document.body);
 *
 */


// Regular Expressions for parsing tags and attributes
const startTag = /^<([-A-Za-z0-9_]+)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
	endTag = /^<\/([-A-Za-z0-9_]+)[^>]*>/,
	attr = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;

// Empty Elements - HTML 5
const empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,link,meta,param,embed,command,keygen,source,track,wbr");

// Block Elements - HTML 5
const block = makeMap("a,address,article,applet,aside,audio,blockquote,button,canvas,center,dd,del,dir,div,dl,dt,fieldset,figcaption,figure,footer,form,frameset,h1,h2,h3,h4,h5,h6,header,hgroup,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,output,p,pre,section,script,table,tbody,td,tfoot,th,thead,tr,ul,video");

// Inline Elements - HTML 5
const inline = makeMap("abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

// Elements that you can, intentionally, leave open
// (and which close themselves)
const closeSelf = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");

// Attributes that have their values filled in disabled="disabled"
const fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

// Special Elements (can contain anything)
const special = makeMap("script,style");

export const HTMLParser = function (html, handler) {
	let index, chars, match, stack = [], last = html;
	stack.last = function () {
		return this[this.length - 1];
	};

	while (html) {
		chars = true;

		// Make sure we're not in a script or style element
		if (!stack.last() || !special[stack.last()]) {

			// Comment
			if (html.indexOf("<!--") == 0) {
				index = html.indexOf("-->");

				if (index >= 0) {
					if (handler.comment)
						handler.comment(html.substring(4, index));
					html = html.substring(index + 3);
					chars = false;
				}

				// end tag
			} else if (html.indexOf("</") == 0) {
				match = html.match(endTag);

				if (match) {
					html = html.substring(match[0].length);
					match[0].replace(endTag, parseEndTag);
					chars = false;
				}

			} else if (html.indexOf("<!") == 0) {
				// doctype
				html = html.substring(html.indexOf(">") + 1);
			} else if (html.indexOf("<") == 0) {
				// start tag
				match = html.match(startTag);

				if (match) {
					html = html.substring(match[0].length);
					match[0].replace(startTag, parseStartTag);
					chars = false;
				}
			}

			if (chars) {
				index = html.indexOf("<");

				const text = index < 0 ? html : html.substring(0, index);
				html = index < 0 ? "" : html.substring(index);

				if (handler.chars)
					handler.chars(text);
			}

		} else {
			html = html.replace(new RegExp("([\\s\\S]*?)<\/" + stack.last() + "[^>]*>"), function (_all, text) {
				text = text.replace(/<!--([\s\S]*?)-->|<!\[CDATA\[([\s\S]*?)]]>/g, "$1$2");
				if (handler.chars)
					handler.chars(text);

				return "";
			});

			parseEndTag("", stack.last());
		}

		if (html == last)
			throw new Error("Parse Error: " + JSON.stringify(stack) + html.substring(0, 20));
		last = html;
	}

	// Clean up any remaining tags
	parseEndTag();

	function parseStartTag(_tag, tagName, rest, unary) {
		tagName = tagName.toLowerCase();

		if (block[tagName]) {
			while (stack.last() && inline[stack.last()]) {
				parseEndTag("", stack.last());
			}
		}

		if (closeSelf[tagName] && stack.last() == tagName) {
			parseEndTag("", tagName);
		}

		unary = empty[tagName] || !!unary;

		if (!unary)
			stack.push(tagName);

		if (handler.start) {
			const attrs = [];

			rest.replace(attr, function (_match, name) {
				const value = arguments[2] ? arguments[2] :
					arguments[3] ? arguments[3] :
					arguments[4] ? arguments[4] :
					fillAttrs[name] ? name : "";

				attrs.push({
					name: name,
					value: value,
					escaped: value.replace(/(^|[^\\])"/g, '$1\\\"') //"
				});
			});

			if (handler.start)
				handler.start(tagName, attrs, unary);
		}
	}

	function parseEndTag(_tag, tagName) {
		if(tagName!== undefined) tagName = tagName.toLowerCase();
		// If no tag name is provided, clean shop
		let pos = 0;
		if (tagName) {
			pos = stack.indexOf(tagName)
		}
		if (pos >= 0) {
			// Close all the open elements, up the stack
			for (let i = stack.length - 1; i >= pos; i--)
				if (handler.end)
					handler.end(stack[i]);

			// Remove the open elements from the stack
			stack.length = pos;
		}
	}
};

export const HTMLtoXML = function (html) {
	const results = "";

	HTMLParser(html, {
		start: function (tag, attrs, _unary) {
			results += "<" + tag;

			for (const i = 0; i < attrs.length; i++)
				results += " " + attrs[i].name + '="' + attrs[i].escaped + '"';
			results += ">";
		},
		end: function (tag) {
			results += "</" + tag + ">";
		},
		chars: function (text) {
			results += text;
		},
		comment: function (text) {
			results += "<!--" + text + "-->";
		}
	});

	return results;
};

export const HTMLtoDOM = function (html, doc) {
	// There can be only one of these elements
	const one = makeMap("html,head,body,title");

	// Enforce a structure for the document
	const structure = {
		link: "head",
		base: "head"
	};

	if (!doc) {
		if (typeof DOMDocument != "undefined")
			doc = new DOMDocument();
		else if (typeof document != "undefined" && document.implementation && document.implementation.createDocument)
			doc = document.implementation.createDocument("", "", null);
		else if (typeof ActiveX != "undefined")
			doc = new ActiveXObject("Msxml.DOMDocument");

	} else
		doc = doc.ownerDocument ||
			doc.getOwnerDocument && doc.getOwnerDocument() ||
			doc;

	const elems = [],
		documentElement = doc.documentElement ||
			doc.getDocumentElement && doc.getDocumentElement();

	// If we're dealing with an empty document then we
	// need to pre-populate it with the HTML document structure
	if (!documentElement && doc.createElement) (function () {
		const html = doc.createElement("html");
		const head = doc.createElement("head");
		head.appendChild(doc.createElement("title"));
		html.appendChild(head);
		html.appendChild(doc.createElement("body"));
		doc.appendChild(html);
	})();

	// Find all the unique elements
	if (doc.getElementsByTagName)
		for (const i in one)
			one[i] = doc.getElementsByTagName(i)[0];

	// If we're working with a document, inject contents into
	// the body element
	const curParentNode = one.body;

	HTMLParser(html, {
		start: function (tagName, attrs, unary) {
			// If it's a pre-built element, then we can ignore
			// its construction
			if (one[tagName]) {
				curParentNode = one[tagName];
				if (!unary) {
					elems.push(curParentNode);
				}
				return;
			}

			const elem = doc.createElement(tagName);

			for (const attr in attrs)
				elem.setAttribute(attrs[attr].name, attrs[attr].value);

			if (structure[tagName] && typeof one[structure[tagName]] != "boolean")
				one[structure[tagName]].appendChild(elem);

			else if (curParentNode && curParentNode.appendChild)
				curParentNode.appendChild(elem);

			if (!unary) {
				elems.push(elem);
				curParentNode = elem;
			}
		},
		end: function (_tag) {
			elems.length -= 1;

			// Init the new parentNode
			curParentNode = elems[elems.length - 1];
		},
		chars: function (text) {
			curParentNode.appendChild(doc.createTextNode(text));
		},
		comment: function (_text) {
			// create comment node
		}
	});

	return doc;
};

function makeMap(str) {
	const obj = {}, items = str.split(",");
	for (let i = 0; i < items.length; i++)
		obj[items[i]] = true;
	return obj;
}

function test() {
	const url = 'https://example.com'
	fetch(url).then(x=>x.text()).then(html=>{
		HTMLParser(html, {})
	})
}
