var expect = require('expect.js'),
    sdk = require('../../lib/index.js'),
    VariableList = sdk.VariableList,
    Property = sdk.Property;

/* global describe, it */
describe('Property', function () {
    describe('sanity', function () {
        it('initializes successfully', function () {
            expect((new Property()) instanceof Property).to.be.ok();
        });
        it('allows a description to be set', function () {
            var prop = new Property();
            expect(prop.describe).to.be.a('function');
            expect(prop.describe.bind(prop)).withArgs('Hello Postman').to.not.throwException();
            expect(prop.description).to.be.ok();
            expect(prop.description.toString()).to.be('Hello Postman');
            expect(prop.description.type).to.be('text/plain');
        });
    });

    describe('.describe', function () {
        it('should use an existing Description instance when available', function () {
            var property = new Property({ description: 'Sample description' });

            property.describe('New description');
            expect(property.description).to.eql({ content: 'New description', type: 'text/plain' });
        });
    });

    describe('.toObjectResolved', function () {
        it('should throw an error for invalid arguments', function () {
            var property = new Property();

            expect(property.toObjectResolved.bind(property)).to.throwError();
        });

        it('should resolve properties correctly', function () {
            var property = new Property(),
                parent = new Property();

            parent.variables = new VariableList();
            property.variables = new VariableList({}, [{ key: 'alpha', value: 'foo' }, { key: 'beta', value: 'bar' }]);

            property.setParent(parent);
            expect(property.toObjectResolved()).to.eql({
                variable: [
                    { type: 'any', value: 'foo', key: 'alpha' },
                    { type: 'any', value: 'bar', key: 'beta' }
                ]
            });
        });
    });

    describe('.replaceSubstitutions', function () {
        it('should bail out if a non-string argument is passed', function () {
            expect(Property.replaceSubstitutions(['random'])).to.eql(['random']);
        });
    });

    describe('.replaceSubstitutionsIn', function () {
        it('should bail out if a non-object argument is passed', function () {
            expect(Property.replaceSubstitutionsIn('random')).to.be('random');
        });
    });

    describe('variable resolution', function () {
        it('must resolve variables accurately', function () {
            var unresolvedRequest = {
                    method: 'POST',
                    url: '{{host}}:{{port}}/{{path}}',
                    header: [{ key: '{{headerName}}', value: 'application/json' }],
                    body: {
                        mode: 'urlencoded',
                        urlencoded: [{ key: '{{greeting}}', value: '{{greeting_value}}' }]
                    }
                },
                expectedResolution = {
                    method: 'POST',
                    url: 'postman-echo.com:80/post',
                    header: [{ key: 'Content-Type', value: 'application/json' }],
                    body: {
                        mode: 'urlencoded',
                        urlencoded: [{ key: 'yo', value: 'omg' }]
                    }
                },
                resolved = Property.replaceSubstitutionsIn(unresolvedRequest, [
                    {
                        greeting: 'yo',
                        greeting_value: 'omg'
                    },
                    {
                        host: 'postman-echo.com',
                        port: '80',
                        path: 'post'
                    },
                    {
                        path: 'get',
                        headerName: 'Content-Type'
                    }
                ]);
            expect(resolved).to.eql(expectedResolution);
        });

        it('must resolve variables in complex nested objects correctly', function () {
            var unresolvedRequest = {
                    one: '{{alpha}}-{{beta}}-{{gamma}}',
                    two: { a: '{{alpha}}', b: '{{beta}}', c: '{{gamma}}' },
                    three: ['{{alpha}}', '{{beta}}', '{{gamma}}'],
                    four: [
                        { a: '{{alpha}}', b: '{{beta}}', c: '{{gamma}}' },
                        { d: '{{delta}}', e: '{{epsilon}}', f: '{{theta}}' },
                        { g: '{{iota}}', h: '{{pi}}', i: '{{zeta}}' }
                    ],
                    five: {
                        one: ['{{alpha}}', '{{beta}}', '{{gamma}}'],
                        two: ['{{delta}}', '{{epsilon}}', '{{theta}}'],
                        three: ['{{iota}}', '{{pi}}', '{{zeta}}']
                    },
                    six: [
                        '{{alpha}}',
                        ['{{alpha}}', '{{beta}}', '{{gamma}}'],
                        { a: '{{delta}}', b: '{{epsilon}}', c: '{{theta}}' }
                    ],
                    seven: { a: '{{alpha}}', b: ['{{alpha}}', '{{beta}}', '{{gamma}}'], c: { a: '{{delta}}',
                        b: '{{epsilon}}', c: '{{theta}}' } }
                },
                expectedResolution = {
                    one: 'arbitrary-complex-large',
                    two: { a: 'arbitrary', b: 'complex', c: 'large' },
                    three: ['arbitrary', 'complex', 'large'],
                    four: [
                        { a: 'arbitrary', b: 'complex', c: 'large' },
                        { d: 'nested', e: 'JSON', f: 'property' },
                        { g: 'variable', h: 'resolution', i: 'test' }
                    ],
                    five: {
                        one: ['arbitrary', 'complex', 'large'],
                        two: ['nested', 'JSON', 'property'],
                        three: ['variable', 'resolution', 'test']
                    },
                    six: [
                        'arbitrary',
                        ['arbitrary', 'complex', 'large'],
                        { a: 'nested', b: 'JSON', c: 'property' }
                    ],
                    seven: { a: 'arbitrary', b: ['arbitrary', 'complex', 'large'], c: { a: 'nested',
                        b: 'JSON', c: 'property' } }
                },
                resolved = Property.replaceSubstitutionsIn(unresolvedRequest, [
                    {
                        alpha: 'arbitrary',
                        beta: 'complex',
                        gamma: 'large'
                    },
                    {
                        delta: 'nested',
                        epsilon: 'JSON',
                        theta: 'property'
                    },
                    {
                        iota: 'variable',
                        pi: 'resolution',
                        zeta: 'test'
                    }
                ]);
            expect(resolved).to.eql(expectedResolution);
        });
    });
});
