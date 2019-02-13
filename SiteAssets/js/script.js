var jq$ = jQuery.noConflict();
var requestHeaders = { 'ACCEPT': 'application/json; odata=verbose' };
var acronymUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/GetByTitle('Acronym')/items";
var requestUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/GetByTitle('AcronymRequest')/items";
var selectStr = "?$select=ID,Title,Definition,Category/Title";
var expandStr = "&$expand=Category";

var acronyms = new Vue({
    el: '#AcronymMaster',
    data: {
        categories: [],
        results: [],
        requestObj: null,
        moreIncrement: 50,
        isLoading: false,
        isSaving: false,
        errMsg: "",
        selectedCategory: 0,
        selectedLetter: "",
        qry: "",
        letters: []
    },
    methods: {
        MakeRequest: function() {
            this.requestObj = {
                ID: 0,
                Title: "",
                Definition: "",
                CategoryId: 0
            };
        },
        GetItemTypeForListName: function(name) {
            return "SP.Data." + name.replace(" ", "_x0020_") + "ListItem";
        },
        BuildAlphabet: function() {
            var letterLst = ("0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z").split(",");
            for (var l = 0; l < letterLst.length; l++) {
                var letterObj = {
                    value: letterLst[l]
                };
                this.letters.push(letterObj);
            }
        },
        LetterClick: function(letterStr) {
            this.selectedLetter = letterStr;
            this.GetResults(this.moreIncrement);
        },
        MenuHandler: function(clickedObj) {
            var elementID = "#" + clickedObj;
            
            if(clickedObj.indexOf("Show") === 0) {
                jQuery(elementID).parent().parent().find(".sectionItems").show();
                jQuery(elementID).hide();
                jQuery(elementID).removeClass("ShowArrow");
                jQuery(elementID.replace("Show", "Hide")).show();
            }
            else {
                jQuery(elementID).parent().parent().find(".sectionItems").hide();
                jQuery(elementID).hide();
                jQuery(elementID.replace("Hide", "Show")).show();                
            }
        },
        EnterCheck: function(e) {
            if(e.keyCode === 13)
                this.GetResults(this.moreIncrement);
        },
        MoreClick: function() {
            var resultCount = this.results.length + this.moreIncrement;
            this.GetResults(resultCount);
        },
        CategoryClick: function(field, categoryObj) {
            this.selectedCategory = categoryObj.ID;
            this.GetResults(this.moreIncrement);
        },
        ClearCategoryFilter: function(categoryObj) {
            this.selectedCategory = 0;
            this.GetResults(this.moreIncrement);
        },
        GetResults: function(count) {
            this.isLoading = true;
            this.results = [];
            var countStr = "&$top=" + count;
            var selectStr = "?$select=Title,Definition,Category/Title";
            var expandStr = "&$expand=Category";
            var qryStr = "";
            var orderbyStr = "&$orderby=Title asc";

            if(this.selectedCategory > 0)
                qryStr = "(Category/ID eq " + this.selectedCategory + ")";
            
                if(this.qry.length > 0)
            {
                if(qryStr.length > 0)
                    qryStr += "and";

                qryStr += "((substringof('" + this.qry + "',Title))or(substringof('" + this.qry + "',Definition)))";
            }
            
            if(this.selectedLetter.length > 0)
            {
                if(qryStr.length > 0)
                    qryStr += "and";
                    
                qryStr += "(Letter eq '" + this.selectedLetter + "')";
            }

            if(qryStr.length > 0)
                qryStr = "&$filter=" + qryStr;

            var restStr = acronymUrl + selectStr + countStr + expandStr + orderbyStr + qryStr;
            var self = this;
            axios({
                method: 'GET',
                url: restStr,
                headers: requestHeaders                
            }).then(function(resp)  {
                var results = resp.data.d.results;
                for(var i = 0; i < results.length; i++)
                {
                    var result = results[i];
                    var acronymObj = {
                        ID: result.Id,
                        Title: result.Title,
                        Definition: result.Definition,
                        CategoryId: result.CategoryId,
                        CategoryTitle: result.Category.Title
                    };
                    self.results.push(acronymObj);
                }
                self.isLoading = false;
            }).catch(function(errObj){
                console.log(errObj);
            });
        },
        GetCategories: function() {
            var selectStr = "$select=Title,ID";
            var orderByStr = "&$orderby=Title";
            var restStr = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getByTitle('Category')/items?" + selectStr + orderByStr;
            var self = this;
            axios({
                method: 'GET',
                url: restStr,
                headers: requestHeaders                
            }).then(function(resp)  {
                var results = resp.data.d.results;
                for(var i = 0; i < results.length; i++)
                {
                    var item = results[i];
                    var categoryObj = { 
                        ID: item.ID,
                        Title: item.Title
                    };
                    self.categories.push(categoryObj);
                }
            }).catch(function(errObj){
                console.log(errObj);
            });
        },
        SearchClick: function() {
            this.GetResults(this.moreIncrement);
        },
        SaveRequestClick: function() {
            if(this.ValidateRequest()) {
                var restStr = requestUrl;
                var createHeader = {
                    'ACCEPT': 'application/json;odata=verbose',
                    'X-RequestDigest': jq$('#__REQUESTDIGEST').val(),
                    'Content-Type': 'application/json; odata=verbose'
                };
                var self = this;
                jQuery.ajax({
                    method: 'POST',
                    url: restStr,
                    headers: createHeader,
                    data: this.GetRequestDataStr(),
                    success: function(resp)  {
                        self.requestObj = null;
                        self.isSaving = false;
                    },
                    error: function(errObj) {
                        console.log(errObj);
                    }
                });
                /*
                axios({
                    method: 'POST',
                    url: restStr,
                    headers: createHeader,
                    data: this.GetRequestDataStr(),
                }).then(function(resp)  {
                    self.requestObj = null;
                    self.isSaving = false;
                }).catch(function(errObj) {
                    console.log(errObj);
                });
                */
            }
        },
        CancelRequestClick: function() {
            this.requestObj = null;
        },
        GetRequestDataStr: function(typeStr) {
            var dataObj = {
                '__metadata': { 
                    'type': this.GetItemTypeForListName("AcronymRequest") 
                },
                Title: this.requestObj.Title,
                Definition: this.requestObj.Definition,
                CategoryId: this.requestObj.CategoryId
            };
            return JSON.stringify(dataObj);
        },
        ValidateRequest: function() {
            var isGood = true;
            this.errMsg = "";
            if(this.requestObj == null)
            {
                isGood = false;
                this.errMsg = "Sorry, no acronym request found";
            }
            else
            {
                if((this.requestObj.Title == null)||(this.requestObj.Title.length === 0))
                {
                    isGood = false;
                    this.errMsg += "Please enter the acronym letters<br />";
                }

                if((this.requestObj.Definition == null)||(this.requestObj.Definition.length === 0))
                {
                    isGood = false;
                    this.errMsg += "Please enter the acronym definition<br />";
                }

                if(this.requestObj.CategoryId === 0)
                {
                    isGood = false;
                    this.errMsg += "Please select a acronym category<br />";
                }
            }
            return isGood;
        },
    },
    created: function() {
        this.GetCategories();
        this.BuildAlphabet();
        this.GetResults(this.moreIncrement);
    }
});