import React, { Component } from "react";
import { Footprint } from "../lib/fpv2";
import "../styles/footprintDemo.css";
import TextAreaCodeEditor from "@uiw/react-textarea-code-editor";

class FootprintDemo extends Component {
  constructor(props) {
    super(props);

    this.state = {
      monitorId: "<your-footprint-profile-id>",
      results: [],
      cache: false,
      config: undefined,
    };

    this.handleClick = this.handleClick.bind(this);
    this.cacheConfig = this.cacheConfig.bind(this);
    this.handleMonitorChange = this.handleMonitorChange.bind(this);
  }

  handleClick(e) {
    var monitorId = this.state.monitorId;
    var configDomain = "fpc.msedge.net";
    var configUrl = `${configDomain}/conf/v2/${monitorId}/fpconfig.min.json`;

    var updateResults = (r) => this.setState({ results: r });
    var config = this.state.cache ? this.state.config : undefined;

    this.setState((state) => ({
      results: [],
      config: state.cache ? this.state.config : undefined,
    }));

    Footprint.start(
      monitorId,
      [configUrl],
      0,
      "footprint-react-demo",
      "",
      {},
      updateResults,
      config,
      (c) => this.setState({ config: c })
    );
  }

  cacheConfig(c) {
    this.setState({ config: c });
  }

  handleMonitorChange(e) {
    this.setState({
      monitorId: e.target.value,
      config: undefined,
      results: [],
    });
  }

  getConfigurationJson() {
    return `// Configuration\n\n${JSON.stringify(
      this.state.config === undefined ? {} : this.state.config,
      null,
      4
    )}`;
  }

  getResultsJson() {
    return `// Results\n\n${JSON.stringify(this.state.results, null, 4)}`;
  }

  render() {
    return (
      <div className="App">
        <div className="codesplit App-header">
          <div className="box">
            <label htmlFor="name-1">Monitor: </label>
            <input
              type="text"
              defaultValue="<your-monitor-id>"
              name="name-1"
              onChange={this.handleMonitorChange}
              className="input"
              style={{ textAlign: "center" }}
            />
            <br />
            <label>
              <input
                name="cb"
                className="mr-2 leading-tight"
                type="checkbox"
                onChange={(e) =>
                  this.setState((state) => ({ cache: !state.cache }))
                }
              />
              <span className="text-sm">Cache Config?</span>
            </label>
            <br />
            <button onClick={this.handleClick}>Run Client</button>
          </div>
        </div>

        <div className="split Results code">
          <TextAreaCodeEditor
            className="json"
            value={this.getConfigurationJson()}
            language="json"
            padding={15}
            style={{ fontSize: 14, overflow: "auto" }}
          />
        </div>

        <div className="split Results">
          <TextAreaCodeEditor
            className="json"
            value={this.getResultsJson()}
            language="json"
            padding={15}
            style={{ fontSize: 14, overflow: "auto" }}
          />
        </div>
      </div>
    );
  }
}

export default FootprintDemo;
