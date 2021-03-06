/*!

    Copyright (C) 2014 Codility Limited. <https://codility.com>

    This file is part of Candidate User Interface (CUI).

    CUI is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version accepted in a public statement
    by Codility Limited.

    CUI is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with CUI.  If not, see <http://www.gnu.org/licenses/>.

*/

/* global Log, Console */
/* global ui */
/* global Trees, TreeEditor, IntEditor */

// http://www.quirksmode.org/js/cookies.html
// use cookies as fallback for sessionStorage in Safari private mode.
function createCookie(name,value) {
    value = encodeURIComponent(value);
    document.cookie = name+"="+value+"; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0){
            return decodeURIComponent(c.substring(nameEQ.length,c.length));
        }
    }
    return null;
}

var TestCases = {
    limit : 5,
    focus : false,
    storage: window.sessionStorage,

    init : function() {
        this.count = 0;
        this.allow_tree_editor = false;
        this.tree_editor = null;

        $('#add_test_case').click(function(e) {
            e.preventDefault();
            if (TestCases.add()) {
                $('.test-case input').last().focus();

                if (TestCases.allow_modal_editor)
                    TestCases.show_modal_for_input($('.test-case input').last());
            }
        });

        var that = this;
        $('#test_cases').on('change keyup paste', 'input', function() { that.save(); });

        $('#tree_editor').jqm({ modal: true });

        this.update();
    },

    enable_modal_editor: function(modal_editor_options) {
        this.allow_modal_editor = true;
        this.modal_editor_options = modal_editor_options;
        $('#test_cases').removeClass('hide-edit');
    },

    disable_modal_editor: function() {
        this.allow_modal_editor = false;
        this.modal_editor_options = null;
        $('#test_cases').addClass('hide-edit');
    },

    // Update layout after changing the number of test cases.
    update: function() {
        $('#add_test_case .counter').text(this.count + '/' + this.limit);
        if (this.count >= this.limit) {
            $('#add_test_case').addClass('limit-reached');
        } else {
            $('#add_test_case').removeClass('limit-reached');
        }

        var value = $('input[name=test_case_example]').val() || '';
        var format = 'format: ' + value;

        // Hack: truncate the test case string,
        // assuming hard-coded font width
        var width = $('#add_test_case .wide').width();
        var font_width = 8;
        if (format.length > width / font_width) {
            var length = Math.floor(width / font_width);
            format = format.slice (0, length - 1) + '\u2026'; // ellipsis
        }
	$('#add_test_case .case-format').text(format);

        ui.updatePageLayout();
        this.save();
    },

    onChangeFocus: function(newFocus) {
        var $title = $('#add_test_case .title');
        var $format = $('#add_test_case .case-format');

        var that = this;
        function transition($from, $to, requiredFocus) {
            setTimeout(function() {
                if (that.focus != requiredFocus)
                    return;
                if ($to.is(':visible'))
                    return;
                $from.fadeOut(200, function() { $to.fadeIn(200); });
            }, 500);
            that.focus = requiredFocus;
        }

        if (!this.focus && newFocus) {
            transition($title, $format, true);
        } else if (this.focus && !newFocus) {
            transition($format, $title, false);
        }
    },

    add : function(value) {
        if (this.count >= this.limit)
            return false;

        Log.info("candidate add test case");

        var num = this.nextID;
        this.nextID++;
        this.count++;

        var $test_case = $('#example_test_case').clone();
        $test_case.addClass('test-case');
        $test_case.removeAttr('id');

        var $input = $test_case.find('input');

        $('#test_cases').append($test_case);
        $test_case.find('.remove').click(function(e) {
            e.preventDefault();
            TestCases.remove($(this).closest('.test-case'));
        });

        $test_case.find('.edit').click(function(e) {
            e.preventDefault();
            if (TestCases.allow_modal_editor)
                TestCases.show_modal_for_input($input);
        });

        $input.val(value);

        var that = this;
        $input.focus(function() { that.onChangeFocus(true); });
        $input.blur(function() { that.onChangeFocus(false); });

        this.update();
        return true;
    },

    clean : function() {
        $('.test-case').each(function(i, tc) {
            var value = $(tc).find('input').val();

           // Replace unicode minus, found in task descriptions.
            var value_clean = value.replace('\u2212', '-');
           // Strip all other non-ASCII characters.
            value_clean = value_clean.replace(/[^\x20-\x7f]/g, '');
            if (value !== value_clean){
                $(tc).find('input').val(value_clean);
                Console.msg(value +" was changed to " + value_clean + ". (Illegal Characters removed.)");
            }
        });
    },

    get_list : function() {
        var test_list = [];
        $('.test-case').each(function(i, tc) {
            var value = $(tc).find('input').val();
            test_list.push(value);
        });
        return test_list;
    },


    remove : function($elt) {
        this.count--;

        Log.info("candidate remove test case");
        $elt.remove();
        this.update();
    },

    save : function() {
        if (!this.storage || !ui.task.loaded)
            return;

        var test_list_json = JSON.stringify(this.get_list());
        var name = 'test_cases_'+ui.options.ticket_id+'_'+ui.task.name;
        try {
            this.storage.setItem(name, test_list_json);
        } catch(e) {
            // Don't log an error if it's about exceeded quota
            // (this might happen in Safari under private mode)
            if (e.message.toLowerCase().indexOf("quota") == -1) {
                Log.error('error saving test cases to sessionStorage', e);
            }
            try {
                createCookie(name, test_list_json);
            } catch(e2) {
                Log.error('error saving test cases to cookie', e2);
            }
        }
    },

    load : function() {
        if (!this.storage || !ui.task.loaded)
            return;

        try {
            var name = 'test_cases_'+ui.options.ticket_id+'_'+ui.task.name;
            var test_list_json = this.storage.getItem(name);
            if (!test_list_json) {
                //try reading from cookie
                test_list_json = readCookie(name);
            }
            if (!test_list_json) {
                return;
            }
            var test_list = $.parseJSON(test_list_json);
            this.removeAll();
            for (var i = 0; i < test_list.length; i++)
                this.add(test_list[i]);
        } catch(e) {
            Log.error('error loading test cases', e);
        }
    },

    removeAll : function() {
        this.count = 0;
        $('.test-case').remove();
    },

    disable : function() {
        this.removeAll();
        $('#test_cases_area').hide();
        ui.updatePageLayout();
    },

    enable : function() {
        this.load();
        $("#test_cases_area").show();
        this.update();
    },

    show_modal: function($elt, input_string, on_ok, on_cancel) {
        var self = {};

        self.options = this.modal_editor_options;
        self.format = self.options.format;

        self.read_tuple = function() {
            try {
                return Trees.parse_tuple(input_string, self.format);
            } catch (e) {
                Console.clear();
                Console.msg_error('Could not parse the test case: ' + e.message);
                return null;
            }
        };

        self.init = function() {
            var tuple = self.read_tuple();
            if (tuple === null)
                return;

            var tree_name = null;
            for (var i = 0; i < self.format.length; i++) {
                if (self.format[i].type == "tree") {
                    tree_name = self.format[i].name;
                    break;
                }
            }
            if (tree_name === null) {
                throw new Error("Format does not contain a tree");
            }
            var tree = tuple[tree_name];

            self.tree_editor = TreeEditor($elt.find('.tree-editor'),
                                          $elt.find('.undo'),
                                          $elt.find('.warnings'));

            self.tree_editor.set_tree(tree);
            if (self.options.bst)
                self.tree_editor.enable_bst_warning();

            self.int_editors = {};
            for (i = 0; i < self.format.length; i++) {
                if (self.format[i].type == 'tree')
                    continue;
                var $param = self.create_input_for_param(self.format[i], tuple);
                $elt.find('.params').append($param);
            }

            $elt.find('.ok').click(self.handle_ok);
            $elt.find('.cancel').click(self.handle_cancel);

            Console.clear(); // wipe any past parse errors
            $elt.jqmShow();

            // text width is not computed correctly before the modal
            // is shown
            self.tree_editor.update_tree();
        };

        self.destroy_modal = function() {
            $elt.jqmHide();
            $elt.find('.ok').unbind('click');
            $elt.find('.cancel').unbind('click');
            $elt.find('.params').empty();
            self.tree_editor.destroy();
        };

        self.get_tuple_string = function() {
            var tree = self.tree_editor.tree;
            var tuple = {};
            for (var i = 0; i < self.format.length; i++) {
                if (self.format[i].type == 'tree')
                    tuple[self.format[i].name] = tree;
                else {
                    var value = self.int_editors[self.format[i].name].get_value();
                    if (value === null) {
                        Console.msg_error('Invalid value for parameter ' + self.format[i].name + ', using 0.');
                        value = 0;
                    }
                    tuple[self.format[i].name] = value;
                }
            }
            return Trees.serialize_tuple(tuple, self.format);
        };

        self.create_input_for_param = function(param, tuple) {
            var $param = $('<div class="param"><span class="name"></span> = <input type="text"></input></div>');
            $param.find('.name').text(param.name);
            // note we use ints only, so no need to deserialize
            $param.find('input').val(tuple[param.name]);
            $param.attr('data-name', param.name);
            self.int_editors[param.name] = IntEditor($param.find('input'));
            return $param;
        };

        self.handle_ok = function(e) {
            e.preventDefault();
            var tuple_string = self.get_tuple_string();
            self.destroy_modal();
            on_ok(tuple_string);
        };

        self.handle_cancel = function(e) {
            e.preventDefault();
            self.destroy_modal();
            on_cancel();
        };

        self.init();
    },

    show_modal_for_input: function($input) {
        var tree_string = $input.val();
        if (tree_string === '')
            tree_string = $('input[name=test_case_example]').val();

        function on_ok(result_tree_string) {
            $input.val(result_tree_string);
            TestCases.save();
        }

        function on_cancel() {
            if ($input.val() === '') {
                TestCases.remove($input.closest('.test-case'));
            }
        }

        try {
            this.show_modal($('#tree_editor'), tree_string, on_ok, on_cancel);
        } catch(e) {
            $('#tree_editor').jqmHide();
            this.disable_modal_editor();
            Console.msg_error('Error opening the tree editor. Please edit the test case manually, or open the page in another browser.');
            Log.error('error opening tree editor', e);
        }

    }
};
