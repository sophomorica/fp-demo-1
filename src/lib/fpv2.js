var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.Footprint = void 0;
var version_1 = require("./version");
var Footprint = (function () {
  var IMG_FETCH_HTTPS_FLAG = 1; // measurement type for img fetch https
  var IMG_FETCH_HTTP_FLAG = 2; // measurement type for img fetch http
  var IMG_FETCH_FLAGS = IMG_FETCH_HTTPS_FLAG | IMG_FETCH_HTTP_FLAG;
  var THROUGHPUT_HTTPS_FLAG = 8; // measurement type for throughput https
  var THROUGHPUT_HTTP_FLAG = 16; // measurement type for throughput http
  var THROUGHPUT_FLAGS = THROUGHPUT_HTTPS_FLAG | THROUGHPUT_HTTP_FLAG;
  var IMG_FLAGS = IMG_FETCH_FLAGS | THROUGHPUT_FLAGS;
  var XHR_FETCH_HTTPS_FLAG = 128; // measurement type for xhr fetch https
  var XHR_FETCH_HTTP_FLAG = 256; // measurement type for xhr fetch http
  var XHR_FETCH_FLAGS = XHR_FETCH_HTTPS_FLAG | XHR_FETCH_HTTP_FLAG;
  var FETCH_FLAGS = IMG_FETCH_FLAGS | XHR_FETCH_FLAGS;
  var HTTP_PROT = "http://"; // identifies the HTTP scheme
  // var HTTPS_PROT = "https://"; // identifies the HTTPS scheme
  var MAX_TAG_LENGTH = 200; // 200 characters is defined in the FPv1 spec as the maximum tag length.
  var WARMUP_IMG = "trans.gif"; // 1x1 image used for DNS warmup
  var MEASUREMENT_OBJ_PATH = "/apc/"; // fetch remote images from this path
  var REQUEST_TIMEOUT = 5000; // The number of milliseconds to wait before giving up on a request and marking it failed.
  var LATENCY_IMG = "trans.gif"; // image used for latency measurements
  var THROUGHPUT_IMG = "100k.gif"; // image used for throughput measurements
  var THROUGHPUT_LEN_KILOBITS = 822.128; // = 102766 * 8 / 1000.0. Bytes to bits and then kilobits
  var MILLIS_IN_SECOND = 1000.0; // milliseconds in a second
  var GET_METHOD = "GET";
  var POST_METHOD = "POST";
  var ERROR_VALUE = -1; // result value returned on error
  var REPORT_VERSION = "js/" + version_1.version;
  var USERHOSTADDRESS_HEADER = "x-userhostaddress";
  var ENDPOINT_HEADER = "x-endpoint";
  var FRONTEND_HEADER = "x-frontend";
  var MACHINE_HEADER = "x-machinename";
  /**
   * Begins the Footprint measurements.
   *
   * @param monitorID A unique identifier for the application running this client code.
   * @param configUrls A list of URLs that host footprint configuration for this client.
   * @param requestDelay The delay in milliseconds until measurements will start.
   * @param tag Optional. A string that will be logged and persisted for offline correlation. Truncated to 200 characters.
   * @param customerId Optional. A unique identifier for the customer requesting the measurement, relevant to the application running this client.
   * @param endpointSubstitutionMap Optional. Used to substitute host names when taking measurements
   * @param callback Optional. Callback that receives the measurements
   * @param fpconfig Optional. Allows for the override of footprint configurations
   * @param cache Optional. Allows access to the retrieved configuration to allow for caching
   */
  function start(
    monitorID,
    configUrls,
    requestDelay,
    tag,
    customerId,
    endpointSubstitutionMap,
    callback,
    fpconfig,
    cache
  ) {
    if (tag === void 0) {
      tag = "";
    }
    if (customerId === void 0) {
      customerId = "";
    }
    if (endpointSubstitutionMap === void 0) {
      endpointSubstitutionMap = {};
    }
    if (cache === void 0) {
      cache = function (_) {};
    }
    try {
      // Validate input parameters.
      // - monitorID should be a non-empty string.
      // - requestDelay should be a positive integer.
      if (
        !monitorID ||
        monitorID.trim().length === 0 ||
        Number(requestDelay) !== requestDelay ||
        requestDelay % 1 !== 0 ||
        requestDelay < 0
      ) {
        return;
      }
      var customerIdDefined = customerId.trim().length > 0;
      var tagExists = tag.trim().length > 0;
      // check if we need to truncate the tag.
      if (tagExists && tag.trim().length > MAX_TAG_LENGTH) {
        tag = tag.trim().substr(0, MAX_TAG_LENGTH);
      }
      var localProtocol =
        window.location.protocol === "file:"
          ? "https://"
          : window.location.protocol + "//";
      // Give up on this measurement if the browser does not support the JSON or XMLHttpRequest module.
      if (!JSON || typeof XMLHttpRequest === "undefined") {
        return;
      }
      // Give up on this measurement if the browser does not support the below functions of XMLHttpRequest
      if (window.XMLHttpRequest) {
        var xhrCheck = new XMLHttpRequest();
        if (
          !("onload" in xhrCheck) ||
          !("onerror" in xhrCheck) ||
          !("ontimeout" in xhrCheck) ||
          !("getAllResponseHeaders" in xhrCheck)
        ) {
          return;
        }
      } else {
        return;
      }
      var queryParameters_1 = __assign(
        __assign(
          __assign(
            __assign(
              { MonitorID: monitorID },
              customerIdDefined && { customerId: customerId }
            ),
            {
              rid: probeId(),
              w3c: "" + w3cResourceEnabled(),
              prot: window.location.protocol,
              v: REPORT_VERSION,
            }
          ),
          tagExists && { tag: tag }
        ),
        { DATA: "" }
      );
      // Function that configures the measurements and begins the flight
      var configureAndRun_1 = function () {
        var configuration = configureMeasurements(fpconfig, localProtocol); // configure measurements from config
        if (configuration.length === 0) {
          return; // exit if no measurements can be run from this client
        }
        var urls = generateMeasurements(
          configuration,
          localProtocol,
          WARMUP_IMG,
          endpointSubstitutionMap
        );
        var reportUrls = []; // URLs to which probe data will be reported
        for (var _i = 0, _a = fpconfig.r; _i < _a.length; _i++) {
          var reportEndpoint = _a[_i];
          reportUrls.push(
            "" +
              localProtocol +
              reportEndpoint +
              "?" +
              new URLSearchParams(queryParameters_1)
          );
        }
        flight(urls, REQUEST_TIMEOUT, requestDelay, reportUrls, null, callback);
      };
      if (typeof fpconfig === "undefined") {
        // if fpconfig hasn't been loaded
        for (var i in configUrls) {
          // prepend configUrls with the correct scheme and append monitorId and customerId to the config url
          configUrls[i] =
            localProtocol +
            configUrls[i] +
            "?" +
            ("monitorId=" +
              monitorID +
              (customerIdDefined ? "&customerId=" + customerId : ""));
        }
        var configRequestComplete = function (req) {
          fpconfig = JSON.parse(req.responseText);
          cache(fpconfig);
          configureAndRun_1();
        };
        fallbackRequest(configUrls, 0, GET_METHOD, configRequestComplete);
      } else {
        configureAndRun_1();
      }
    } catch (e) {}
  }
  /**
   * Makes XHR to the input urls until a request is successful or all urls have been attempted.
   *
   * @param urls An array of URLs to make requests to.
   * @param urlIndex The index of the URL that will be tested.
   * @param method The http method. "GET" or "POST"
   * @param onComplete The function callback on a successful request. Since this function returns
   * after a successful request, this function will only be called once.
   */
  function fallbackRequest(urls, urlIndex, method, onComplete) {
    if (urlIndex >= urls.length) {
      return;
    }
    if (method !== GET_METHOD && method !== POST_METHOD) {
      method = GET_METHOD;
    }
    var failure = function () {
      fallbackRequest(urls, urlIndex + 1, method, onComplete);
    };
    var req = new XMLHttpRequest();
    req.open(method, urls[urlIndex], true);
    req.onload = function () {
      if (req.readyState === 4 && req.status === 200) {
        if (onComplete != null) {
          onComplete(req);
        }
      } else {
        failure();
      }
    };
    req.onerror = failure;
    req.timeout = REQUEST_TIMEOUT;
    req.ontimeout = failure;
    req.send();
  }
  /**
   * Selects which measurements will be executed based on the input footprint configuration.
   *
   * @param fpconfig The Footprint configuration.
   * @param localProtocol The protocol of the host page. E.g. "http://" or "https://"
   * @return Array of configuration objects containing measurement id and testImage properties.
   */
  function configureMeasurements(fpconfig, localProtocol) {
    var idsWithWeights = [];
    var totalWeight = 0;
    // Select all possible measurements that can be executed (fetch and throughput)
    var fetchAndThroughputFlags = FETCH_FLAGS | THROUGHPUT_FLAGS;
    for (var _i = 0, _a = fpconfig.e; _i < _a.length; _i++) {
      var entry = _a[_i];
      if (entry.w > 0 && entry.m & fetchAndThroughputFlags) {
        totalWeight += entry.w;
        idsWithWeights.push({
          endpoint: entry.e,
          cumWeight: totalWeight,
          weight: entry.w,
          measurementTypes: entry.m,
        });
      }
    }
    var acceptedFlags =
      localProtocol.toLowerCase() === HTTP_PROT
        ? [IMG_FETCH_HTTP_FLAG, THROUGHPUT_HTTP_FLAG, XHR_FETCH_HTTP_FLAG]
        : [IMG_FETCH_HTTPS_FLAG, THROUGHPUT_HTTPS_FLAG, XHR_FETCH_HTTPS_FLAG];
    var testImages = [LATENCY_IMG, THROUGHPUT_IMG, LATENCY_IMG];
    var ranks = [1, 3, 2];
    var config = [];
    var idCount = Math.min(fpconfig.n, idsWithWeights.length);
    for (var id = 0; id < idCount; id++) {
      var randomWeight = Math.floor(Math.random() * totalWeight);
      var randomItem = null;
      for (var i = 0; i < idsWithWeights.length; i++) {
        if (randomItem == null) {
          if (randomWeight < idsWithWeights[i].cumWeight) {
            randomItem = idsWithWeights[i];
            /* Don't break here to finish adjusting the weights of remaining items.
                           Make the cumWeight of this item 0 so it will never be picked again */
            idsWithWeights[i].cumWeight = 0;
          }
        } else {
          /* Since we found an item, all of the subsequent items need to subtract the
                       selected items weight from their cumulative weight */
          idsWithWeights[i].cumWeight -= randomItem.weight;
        }
      }
      totalWeight -= randomItem.weight; // subtract the weight of the selected item from the total
      var guid = randomItem.endpoint.charAt(0) === "*" ? probeId() : ""; // generate a new guid for each endpoint that has a wildcard
      for (var n = 0; n < acceptedFlags.length; n++) {
        if (randomItem.measurementTypes & acceptedFlags[n]) {
          config.push({
            id: randomItem.endpoint,
            testImage: testImages[n],
            measurementType: acceptedFlags[n],
            guid: guid,
            rank: ranks[n],
          });
        }
      }
    }
    config.sort(function (a, b) {
      return a.rank - b.rank;
    });
    return config;
  }
  /**
   * Generates the measurement URLs based on the input configuration.
   *
   * @param measurementConfigs Array of config objects containing an endpoint id, testImage, measurementType, guid, and rank.
   * @param localProtocol The protocol of the host page. E.g. "http://" or "https://"
   * @param warmupImg the image to be fetched for measurement warmup
   * @param endpointSubstitutionMap Optional. Used to substitute host names when taking measurements
   * @return Array of measurement objects containing url, requestID, object, conn, measurementType and report properties.
   */
  function generateMeasurements(
    measurementConfigs,
    localProtocol,
    warmupImg,
    endpointSubstitutionMap
  ) {
    if (endpointSubstitutionMap === void 0) {
      endpointSubstitutionMap = {};
    }
    var urlIds = [];
    for (
      var _i = 0, measurementConfigs_1 = measurementConfigs;
      _i < measurementConfigs_1.length;
      _i++
    ) {
      var config = measurementConfigs_1[_i];
      var measurementType = config.measurementType;
      var testImg = config.testImage; // the image that will have its download latency reported
      var guid = config.guid;
      var id = config.id;
      var testurl =
        localProtocol +
        ((endpointSubstitutionMap && endpointSubstitutionMap[id]) || id);
      if (id.indexOf(".") === -1) {
        // if this id doesn't contain a 'dot', then assume it is a FPv1 measurement id
        testurl += ".clo.footprintdns.com"; // for backwards compatibility with FPv1
      } else if (id.charAt(0) === "*") {
        var fqdn = id.substring(2); // get the everything after the "*."
        testurl = localProtocol + guid + "." + fqdn; // the id does have a dot so we assume it to be a FQDN.
        id =
          fqdn === "clo.footprintdns.com" ||
          fqdn === "fp.measure.office.com" ||
          fqdn === "azr.footprintdns.com"
            ? guid
            : fqdn; // If the id ends with these hostnames then the requestID will be the guid, otherwise it will be the FQDN.
      }
      testurl += MEASUREMENT_OBJ_PATH;
      var coldUrl = testurl + warmupImg + "?" + probeId();
      var reportCold = (measurementType & THROUGHPUT_FLAGS) !== measurementType; // don't report cold measurement for throughput. It may not be cold if the same endpoint was measured already.
      urlIds.push({
        url: coldUrl,
        requestID: id,
        object: warmupImg,
        conn: "cold",
        measurementType: measurementType,
        report: reportCold,
      });
      var warmUrl = testurl + testImg + "?" + probeId();
      urlIds.push({
        url: warmUrl,
        requestID: id,
        object: testImg,
        conn: "warm",
        measurementType: measurementType,
        report: true,
      });
    }
    return urlIds;
  }
  /**
   * Structures measurement results into collection.
   * @param loadTimes raw latency measurements
   * @param urlIds measurement data associated with each latency measurement
   */
  function createReport(
    loadTimes,
    userHostAddresses,
    endPoints,
    frontends,
    machines,
    urlIds
  ) {
    //list of result objects
    var results = [];
    for (var i = 0; i < urlIds.length; i++) {
      if (!urlIds[i].report) {
        continue; // skip measurement if report is false
      }
      var rawLatency = loadTimes[i];
      var measurementType = urlIds[i].measurementType;
      var processedMeasurement = createMeasurementResult(
        rawLatency,
        measurementType
      );
      var result = {};
      result.RequestID = urlIds[i].requestID;
      result.Object = urlIds[i].object;
      result.Conn = urlIds[i].conn;
      result.Result = processedMeasurement;
      result.T = measurementType;
      if (userHostAddresses[i]) {
        result.Rip = userHostAddresses[i];
      }
      if (endPoints[i]) {
        result.Ep = endPoints[i];
      }
      if (frontends[i]) {
        result.Fe = frontends[i];
      }
      if (machines[i]) {
        result.Mn = machines[i];
      }
      results.push(result);
    }
    return results;
  }
  /**
   * Convert a raw latency value into its reportable form.
   * @param rawLatencyMillis
   * @param measurementType
   */
  function createMeasurementResult(rawLatencyMillis, measurementType) {
    if (rawLatencyMillis <= 0) {
      return rawLatencyMillis;
    }
    if (measurementType & THROUGHPUT_FLAGS && rawLatencyMillis > 0) {
      var kbps =
        THROUGHPUT_LEN_KILOBITS / (rawLatencyMillis / MILLIS_IN_SECOND);
      return Math.round(kbps);
    }
    return Math.round(rawLatencyMillis);
  }
  /*
   * Generates an RFC4122 version 4 GUID to identify individual probes.
   * "-"s are left out of the GUID so that it remains alphanumeric only.
   */
  function probeId() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
  }
  /*
   * Checks if the browser has W3C resource timing enabled.
   */
  function w3cResourceEnabled() {
    return window.performance && window.performance.getEntriesByName
      ? true
      : false;
  }
  /**
   * Runs a measurement test for a user provided list of URLs and sends a JSON report
   * back to a report server.
   */
  function flight(
    urls,
    reqTimeout,
    reqDelay,
    reportUrls,
    onComplete,
    callback
  ) {
    var loadTimes = [];
    var userHostAddresses = [];
    var endPoints = [];
    var frontends = [];
    var machines = [];
    for (var i = 0; i < urls.length; i++) {
      loadTimes[i] = ERROR_VALUE;
      userHostAddresses[i] = null;
      endPoints[i] = null;
      frontends[i] = null;
      machines[i] = null;
    }
    function errorHandler(index) {
      // Skip warm measurement if cold measurement failed
      if (urls[index].conn === "cold") {
        urls[index + 1].report = false; // don't report warm measurement
        doProbe(index + 2); // don't perform warm measurement
      } else {
        doProbe(index + 1);
      }
    }
    // Used in the case that endpoint doesn't support CORS
    function doImgProbe(index) {
      var timeoutId;
      var img = new Image();
      img.onload = function () {
        loadTimes[index] = new Date().getTime() - startTime;
        // clear timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        doProbe(index + 1);
      };
      img.onerror = function () {
        // clear timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        errorHandler(index);
      };
      // Configure to give up on the load after reqTimeout ms.
      timeoutId = setTimeout(function () {
        // clear event handlers
        img.onload = null;
        img.onerror = null;
        errorHandler(index);
      }, reqTimeout);
      var startTime = new Date().getTime();
      img.src = urls[index].url;
    }
    // Used in the case that endpoint supports CORS
    function doXhrProbe(index) {
      try {
        var xhr_1 = new XMLHttpRequest();
        xhr_1.open(GET_METHOD, urls[index].url, true);
        xhr_1.onload = function () {
          try {
            if (xhr_1.readyState === 4) {
              if (xhr_1.status === 200) {
                loadTimes[index] = new Date().getTime() - startTime_1;
                // Get the raw header string
                var rawHeader = xhr_1.getAllResponseHeaders();
                if (rawHeader) {
                  // Convert the header string into an array of individual headers
                  var headers = rawHeader.split("\r\n");
                  headers.forEach(function (line) {
                    var header = line
                      .substring(0, line.indexOf(":"))
                      .toLowerCase();
                    var value = line.substring(line.indexOf(":") + 1);
                    if (header === USERHOSTADDRESS_HEADER) {
                      userHostAddresses[index] = value;
                    } else if (header === ENDPOINT_HEADER) {
                      endPoints[index] = value;
                    } else if (header === FRONTEND_HEADER) {
                      frontends[index] = value;
                    } else if (header === MACHINE_HEADER) {
                      machines[index] = value;
                    }
                  });
                }
                doProbe(index + 1);
              } else {
                loadTimes[index] = 0 - xhr_1.status;
                errorHandler(index);
              }
            } else {
              errorHandler(index);
            }
          } catch (e) {}
        };
        xhr_1.onerror = function () {
          errorHandler(index);
        };
        xhr_1.ontimeout = function () {
          errorHandler(index);
        };
        // Configure to give up on the load after reqTimeout ms.
        xhr_1.timeout = reqTimeout;
        var startTime_1 = new Date().getTime();
        xhr_1.send();
      } catch (e) {}
    }
    var generateReportAndUpload = function () {
      if (reportUrls != null && reportUrls.length !== 0) {
        /*
                    Generate a report.
                    First look for W3C resource timings and then fall back to less
                    accurate timing if W3C is not supported in this browser.
                    Second check because Firefox doesn't support resource timing yet.
                */
        if (w3cResourceEnabled()) {
          // Find W3C timing for URLs in urlsToTest. Update loadTime Array.
          for (var i_1 = 0; i_1 < urls.length; i_1++) {
            var testUrl = urls[i_1].url;
            var perfEntryArray = window.performance.getEntriesByName(testUrl);
            /*
                            Only update the loadTime for this testUrl if the value is not negative
                            from a timeout or error. Otherwise, it will fill in the time it took
                            to return a 404, for example.
                        */
            if (loadTimes[i_1] >= 0 && perfEntryArray && perfEntryArray[0]) {
              /*
                             Resources fetched from cross domains only have limited timing information available,
                             startTime, fetchTime, duration, and responseEnd. duration = responseEnd - startTime.
                             */
              loadTimes[i_1] = perfEntryArray[0].duration;
            }
          }
        }
        var report_1 = createReport(
          loadTimes,
          userHostAddresses,
          endPoints,
          frontends,
          machines,
          urls
        );
        var reportStr = JSON.stringify(report_1);
        var reportRequests = [];
        for (var j = 0; j < reportUrls.length; j++) {
          var reportRequest = reportUrls[j] + reportStr;
          reportRequests.push(reportRequest);
        }
        fallbackRequest(reportRequests, 0, GET_METHOD, function () {
          try {
            // Execute success callback with results
            callback && callback(report_1);
          } catch (_a) {}
        });
      }
    };
    // start with index 0 from urls since we assume that the measurements are ordered as cold, hot, cold, hot, ...
    // the configureMeasurements now takes care of starting points across measurements
    function doProbe(index) {
      try {
        if (index < urls.length) {
          if (urls[index].measurementType & IMG_FLAGS) {
            doImgProbe(index);
          } else {
            doXhrProbe(index);
          }
        } else {
          generateReportAndUpload();
          // Execute onComplete function now that probes are finished
          if (onComplete != null) {
            onComplete();
          }
        }
      } catch (e) {}
    }
    // wait for reqDelay(ms) to prevent confusing page load events of the parent page
    // or delaying things the page itself wants to do when it finishes loading
    setTimeout(function () {
      doProbe(0);
    }, reqDelay);
  }
  // The public API for the Footprint module
  return {
    start: start,
  };
})();
exports.Footprint = Footprint;
