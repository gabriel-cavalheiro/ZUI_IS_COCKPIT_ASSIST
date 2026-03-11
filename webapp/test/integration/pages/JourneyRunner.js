sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"br/com/gamma/zuiiscockpitassist/test/integration/pages/CockpitList",
	"br/com/gamma/zuiiscockpitassist/test/integration/pages/CockpitObjectPage"
], function (JourneyRunner, CockpitList, CockpitObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('br/com/gamma/zuiiscockpitassist') + '/test/flp.html#app-preview',
        pages: {
			onTheCockpitList: CockpitList,
			onTheCockpitObjectPage: CockpitObjectPage
        },
        async: true
    });

    return runner;
});

