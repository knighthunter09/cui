'''

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

'''


from django.test.simple import DjangoTestSuiteRunner
import unittest

import tests


class CUITestRunner(DjangoTestSuiteRunner):
    '''Test runner for the stand-alone CUI app.'''

    def build_suite(self, *args, **kwargs):
        suite = unittest.TestSuite()
        suite.addTest(unittest.defaultTestLoader.loadTestsFromModule(tests))
        return suite
