describe('Composable', function () {

    beforeAll(function () {
        document.body.insertAdjacentHTML('afterbegin', window.__html__['fixture.html']);
        window.testData = {test1: [1, 2, 3], test2: {a: 1,b: 2,c: 3}, test3: 11};
    });

    afterAll(function () {
        document.body.removeChild(document.getElementById('fixture'));
        delete window.testData;
    });

    it('should select child node and match part of inner text and parses as int', function () {
        var extractedData = Composable({
            a: [
                'document',
                'querySelector:#test-div1',
                'innerText',
                'match:/\\d/',
                'getIndex:0',
                'toInt'
            ]
        });
        expect(extractedData.a).toEqual(1);
    });
	
    it('should parse regular expressions with commas and slashes', function () {
        var extractedData = Composable({
            b: [
                'document',
                'querySelector:#test-span3',
                'innerText',
                'match:/Test, Span\/ 3/g',
                'getIndex:0'
            ]
        });
        expect(extractedData.b).toEqual('Test, Span/ 3');
    });
	
    it('should do regular expression replace with commas and slashes', function () {
        var extractedData = Composable({
            a: [
                'document',
                'querySelector:#test-span3',
                'innerText',
                'replace:/Test, Span\/ 3/g,Test Span 3'
            ]
        });
        expect(extractedData.a).toEqual('Test Span 3');
    });
	
    it('should support using callable transformations', function () {
        var extractedData = Composable({
            a: [
                Composable.T.document,
                Composable.T.querySelector('#test-div1'),
                Composable.T.innerText,
                Composable.T.match(/\d/),
                Composable.T.getIndex(0),
                Composable.T.toInt
            ]
        });
        expect(extractedData.a).toEqual(1);
    });
	
    it('should take input data and get properties and indices', function () {
        var extractedData = Composable({
            a: [
                'window',
                'getProperties:testData.test1.1'
            ]
        });
        expect(extractedData.a).toEqual(2);
    });
	
    describe('getTransformation', function () {
        it('should work with sub commands which do and do not have arguments', function () {
            var extractedData = Composable({
                a: [
                    'document',
                    'querySelectorAll:.test-input-div',
                    'map:querySelector:input',
                    'map:value',
                    'map:toInt'
                ]
            });
            expect(extractedData.a).toEqual([1, 2, 3, 4]);
        });
	
        it('should treat arguments of standard transformations, with the same name as a transformation, as arguments', function () {
            var extractedData = Composable({
                a: [
                    'document',
                    'querySelector:.test-match',
                    'innerText',
                    'match:match',
                    'getIndex:0'
                ]
            });
            expect(extractedData.a).toEqual('match');
        });
	
        it('should treat arguments of array transformations as transformations', function () {
            var extractedData = Composable({
                a: [
                    'document',
                    'querySelectorAll:.test-match',
                    'map:innerText',
                    'map:match:match',
                    'map:getIndex:0'
                ]
            });
            expect(extractedData.a).toEqual(['match', 'match']);
        });
    });
	
    describe('array transformations', function () {
        it('should run map', function () {
            var extractedData = Composable({
                a: [
                    'document',
                    'querySelectorAll:.test-input-div',
                    'map:querySelector:input',
                    'map:value',
                    'map:toInt'
                ]
            });
            expect(extractedData.a).toEqual([1, 2, 3, 4]);
        });
    });
	
    describe('transformations', function () {
        it('should get window', function () {
            expect(Composable.T.window()).toEqual(window);
        });
	
        it('should get document', function () {
            expect(Composable.T.document()).toEqual(document);
        });
	
        it('should run toFloat', function () {
            expect(Composable.T.toFloat('12.34')).toEqual(12.34);
        });
	
        it('should run toInt', function () {
            expect(Composable.T.toInt('12.34')).toEqual(12);
            expect(Composable.T.toInt('12')).toEqual(12);
        });
	
        it('should run round', function () {
            expect(Composable.T.round(12.34)).toEqual(12);
            expect(Composable.T.round(12.54)).toEqual(13);
        });
	
        it('should run multiplyBy', function () {
            expect(Composable.T.multiplyBy(100)(12.34)).toEqual(1234);
            expect(Composable.T.multiplyBy(20)('12.54')).toEqual(null);
        });
	
        it('should run htmlToText', function () {
            expect(Composable.T.htmlToText('&amp;')).toEqual('&');
        });
	
        it('should run toString', function () {
            expect(Composable.T.toString(12.34)).toEqual('12.34');
        });
	
        it('should run trim', function () {
            expect(Composable.T.trim('  asdf  \n')).toEqual('asdf');
        });
	
        it('should run split', function () {
            expect(Composable.T.split('\n')('asdf\nasdf')).toEqual(['asdf', 'asdf']);
            expect(Composable.T.split('\n', 1)('asdf\nasdf')).toEqual(['asdf']);
        });
	
        it('should run replace', function () {
            expect(Composable.T.replace(/\s+/, ' ')('asdf\n\tasdf')).toEqual('asdf asdf');
            expect(Composable.T.replace('\n', ' ')('asdf\nasdf')).toEqual('asdf asdf');
        });

        it('should run match', function () {
            var result = ['asdf1234', '1234'];
            result.index = 0;
            result.input = 'asdf1234\nasdf';
            expect(Composable.T.match(/[a-z]+(\d+)/)('asdf1234\nasdf')).toEqual(result);
        });

        it('should run getIndex', function () {
            expect(Composable.T.getIndex(1)([1, 2, 3])).toEqual(2);
        });

        it('should run slice', function () {
            expect(Composable.T.slice(-1)(['a', 'b', 'c'])).toEqual(['c']);
            expect(Composable.T.slice(-1)(document.querySelectorAll('.test-span'))[0].id).toEqual('test-span3');
        });

        it('should run getProperty', function () {
            expect(Composable.T.getProperty('a')({a: 1, b: 2})).toEqual(1);
        });

        it('should run getProperties', function () {
            expect(Composable.T.getProperties('a.b.c')({a: {b: {c: 5}}})).toEqual(5);
        });
    });
});
