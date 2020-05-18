// Web interface to visualize example Anomaly Detection Interaction.
import React, { Component } from "react";
import { DataTable, InlineLoading } from 'carbon-components-react';
import * as _ from "lodash"
import { getJSONData, ColorExplanation, probabilityColor, abbreviateString, postJSONData } from "../helperfunctions/HelperFunctions"
import "./groupview.css"
import DetailView from "../detailview/DetailView";
const { Table, TableHead, TableHeader, TableBody, TableCell, TableRow } = DataTable;


class GroupView extends Component {
    constructor(props) {
        super(props)

        this.state = {
            visibleColumns: 12,
            numDataRows: 50,
            visibleRows: 15,
            // stickyHeader: true,
            tableTitle: " ",
            tableIsSortable: false,
            tableSize: "normal", //tall short normal
            dataRows: [],
            columnNames: ["id"],
            columnDescription: {},
            targetFeature: "",
            datasetName: "KDD 99, Intrusion Detection",
            cellColors: {},
            selecetedRowid: 0,
            predictionsLoaded: false,
            dataLoaded: false,
            showTableView: true,
            maxNumericLength: 7,
        }

        this.baseUrl = "http://localhost:5000"
        this.dataEndpoint = "/data"
        this.predictEndpoint = "/predict"

        this.colnameEndpoint = "/colnames"

        this.explanations = {}

        this.hideDetailView = this.hideDetailView.bind(this);


    }

    // Hide detail view
    hideDetailView() {
        this.setState({ showTableView: true, showDetailView: false })
    }

    componentDidMount() {
        // Fetch Feature List / Data Header
        let getDataHeaderURL = this.baseUrl + this.colnameEndpoint
        let colnames = getJSONData(getDataHeaderURL)
        colnames.then((data) => {
            if (data) {
                let colnames = data["colnames"]
                let coldesc = data["coldesc"]
                if (!colnames.includes("id")) {
                    colnames.unshift("id")
                    coldesc.unshift("id")
                }


                // Add target label to headers
                colnames.unshift(data["label"])
                coldesc.unshift(data["label"])

                // Add prediction label to headers
                colnames.unshift("prediction")
                coldesc.unshift("prediction")


                this.setState({ columnNames: colnames, targetFeature: data["label"], columnDescription: coldesc })
                this.loadData()
            }
        })

        // document.getElementsByClassName("bx--data-table_inner-container")[0].style.height = "1000px"
        // document.getElementsByClassName("bx--data-table")[0].style.height = "1000px"
        // let tableContent = document.getElementsByClassName("bx--data-table_inner-container")[0]
        // // tableContent.style.height = "1000px" //tableContent.getBoundingClientRect().top;
        // console.log(tableContent);

    }



    loadData() {
        // Clear Cell Colors Dict
        this.setState({ cellColors: {} })
        // Fetch Data after features have arrived
        let getDataURL = this.baseUrl + this.dataEndpoint + "?n=" + this.state.numDataRows
        let data = getJSONData(getDataURL)
        data.then((data) => {

            //Create Colors for Target Column 
            let cellColors = {}
            // Datable requires string id
            for (let [i, row] of data.entries()) {
                if (row["id"]) {
                    row["id"] = row["id"] + "";
                } else {
                    row["id"] = i + "";
                }
                cellColors[row["id"] + ":" + this.state.targetFeature] = probabilityColor(row[this.state.targetFeature])
            }
            this.setState({
                dataRows: data, numDataRows: data.length, cellColors: cellColors,
                dataLoaded: true
            })
            this.getPredictions(data)


        })
    }



    getPredictions(data) {
        data = data.slice(0, this.state.visibleRows)
        let predictURL = this.baseUrl + this.predictEndpoint
        let predictions = postJSONData(predictURL, { data: data })
        let cellColors = this.state.cellColors
        predictions.then((data) => {
            let currentData = this.state.dataRows

            for (let [i, row] of data["predictions"].entries()) {
                currentData[i]["prediction"] = data["predictions"][i]
                cellColors[data["ids"][i] + ":prediction"] = probabilityColor(data["predictions"][i])
            }
            this.setState({ dataRow: currentData, cellColors: cellColors, predictionsLoaded: true })
        })
    }




    clickRow(e) {
        this.setState({ selecetedRowid: e.target.getAttribute("rowindex"), showTableView: false, showDetailView: true })

    }

    render() {
        let headers = this.state.columnNames.slice(0, this.state.visibleColumns).map((data, index) => {
            return ({ key: data, header: this.state.columnDescription[index] || data })
        });

        // Add elispsis if we arent showing all feature columns
        if (this.state.columnNames.length >= this.state.visibleColumns) {
            headers.push({ key: "...", header: "..." })
        }

        let rows = this.state.dataRows.slice(0, this.state.visibleRows).map((data, index) => {
            let dataRow = {}
            for (let feature of this.state.columnNames.slice(0, this.state.numShow)) {
                let featureValue = data[feature] === undefined ? "_" : data[feature]
                dataRow[feature] = abbreviateString(featureValue + "", this.state.maxNumericLength)
            }
            return (dataRow)
        });

        let currentDataDetails = []

        if (this.state.dataLoaded) {
            let row = this.state.dataRows[this.state.selecetedRowid];
            currentDataDetails = []
            for (let key of Object.keys(row)) {
                currentDataDetails.push({ id: row["id"], feature: key, value: row[key] })
            }
        }

        console.log(currentDataDetails);


        return (
            <div>

                <div className="boldtext sectiontitle p10">
                    Anomaly Detection on Network Intrusion Data
                </div>
                <div className="flex">

                    {!this.state.predictionsLoaded &&
                        //
                        <div className="smalldesc   iblock flex">
                            <div className="iblock   mr5"> <InlineLoading></InlineLoading>  </div>
                            <div className="iblock   flex flexcolumn flexjustifycenter"> loading anomaly predictions ... </div>

                        </div>}
                    {this.state.predictionsLoaded && <div className="smalldesc p10  flex flexcolumn flexjustifycenter">Showing  {Math.min(this.state.visibleColumns, this.state.columnNames.length)}  of {this.state.columnNames.length}   features  {this.state.visibleRows}  rows. </div>}

                </div>

                <div className="positionrelative  ">
                    <div className="positionabsolute   w100">
                        {(this.state.dataLoaded && this.state.showDetailView) &&
                            <div className=" ">
                                <DetailView
                                    dataDetails={currentDataDetails}
                                    targetFeature={this.state.targetFeature}
                                    cellColors={this.state.cellColors}
                                    hideDetail={this.hideDetailView}
                                    targetFeatureValue={this.state.dataRows[this.state.selecetedRowid][this.state.targetFeature]}
                                ></DetailView>
                            </div>
                        }
                    </div>

                    {this.state.showTableView && <div className=" mb10    datatable-body">
                        <DataTable
                            isSortable={this.state.tableIsSortable}
                            rows={rows}
                            headers={headers}
                            render={({ rows, headers, getHeaderProps }) => (
                                // <TableContainer title={this.state.tableTitle + this.state.datasetName}>
                                <Table className="  tablecontent " stickyHeader={this.state.stickyHeader} size={this.state.tableSize}>
                                    <TableHead>
                                        <TableRow>
                                            {headers.map(header => (
                                                <TableHeader {...getHeaderProps({ header })}>
                                                    {header.header}
                                                </TableHeader>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row, index) => (
                                            <TableRow style={{ cursor: "pointer" }} onClick={this.clickRow.bind(this)} key={row.id} rowid={row.id}>
                                                {row.cells.map(cell => (
                                                    <TableCell style={{ backgroundColor: this.state.cellColors[cell.id] }} key={cell.id} rowid={row.id} rowindex={index}>{cell.value}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                // </TableContainer>
                            )}
                        />
                    </div>}

                </div>





                <div>
                    {/* {JSON.stringify(this.state.dataRows)} */}
                    {/* {explanationColor(0.1) + "\t" + JSON.stringify(this.state.cellColors)} */}
                </div>


            </div>

        );
    }
}

export default GroupView;