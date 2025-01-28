"use client";
import React, { useEffect, useMemo, useState } from "react";
import { fetchUserDetails } from "@/server_functions/auth";
import { ColumnDef, ColumnSort, SortingState } from "@tanstack/react-table";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ScrollTable from "@/components/InfiniteScrollTable/ScrollTable";
import axios from "axios";
import RightModal from "@/components/pure-components/RightModal";
import AddExerciseForm from "@/components/forms/add-exercise-form";
import { API_BASE_URL } from "@/configs/constants";
import Searchbar from "@/components/pure-components/Searchbar";
import { useGlobalContext } from "@/context/GlobalContextProvider";
import TableActions from "@/components/InfiniteScrollTable/TableActions";
import LoadingSpinner from "@/components/LoadingSpinner";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import BatchConfirmationDialog from "@/components/InfiniteScrollTable/batchConfirmationDialog";
import Toast from "@/components/Toast";

const ExercisePage = () => {
    const [modified, setModified] = useState(true);
    const [added, setAdded] = useState(true);
    const [showRightModal, setShowRightModal] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [updatingExercise, setUpdatingExercise] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const { myDetails: trainerDetails } = useGlobalContext();
    const [selectedRows, setSelectedRows] = useState([]);
    const [rows, setRows] = useState([]);
    const [deletePressed, setDeletePressed] = useState(false);
    const [batchApprovalPressed, setBatchApprovalPressed] = useState(false);
    const [modalButtonLoadingState, setModalButtonLoadingState] =
        useState(false);
    const [approving, setApproving] = useState(false);
    const [batchOpTitle, setBatchOpTitle] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState("success");

    const queryClient = new QueryClient();

    const handleApprovalStatusChange = async (
        rowData: ExerciseTemplate,
        newApprovalStatus: boolean
    ) => {
        setUpdatingExercise([...updatingExercise, rowData.id]);
        // Implement your logic here, e.g., update the approval status in the database
        console.log(
            "Approval status changed for row:",
            rowData,
            newApprovalStatus
        );

        try {
            console.log("SENDING INFO TO BACKEND", rowData.id);
            const response = await axios.put(
                `${API_BASE_URL}/mvmt/v1/admin/exercises/${rowData.id}`,
                {
                    approved: newApprovalStatus,
                },
                {
                    withCredentials: true,
                }
            );

            setModified((prevModified) => !prevModified);
        } catch (error) {
            console.error("Error updating exercise approval:", error);
        } finally {
            setUpdatingExercise(
                updatingExercise.filter((id) => id !== rowData.id)
            );
        }
    };

    const handleBatchDelete = async () => {
        try {
            console.log("DELETING EXERCISES", selectedRows);
            const response = await axios.delete(
                `${API_BASE_URL}/mvmt/v1/admin/exercises`,
                {
                    data: {
                        ids: selectedRows.map((row) => row.id),
                    },
                    withCredentials: true,
                }
            );

            setDeletePressed(false);
            setSelectedRows([]);
            setModified((prevModified) => !prevModified);
        } catch (error) {
            console.error("Error deleting exercises:", error);
        }
    };

    const openDeleteConfirmation = () => {
        setDeletePressed(true);
    };

    const handleDeleteCancel = () => {
        setDeletePressed(false);
    };

    const handleBatchApproval = async () => {
        setModalButtonLoadingState(true);
        const promises = selectedRows.map((row) =>
            axios.put(
                `${API_BASE_URL}/mvmt/v1/admin/exercises/${row.id}`,
                {
                    approved: approving,
                },
                {
                    withCredentials: true,
                }
            )
        );

        try {
            const results = await Promise.all(promises);
            const allSuccessful = results.every((res) => res.status === 200);

            if (allSuccessful) {
                // All updates were successful, do something here
                console.log("All updates successful");
                setBatchApprovalPressed(false);
                setSelectedRows([]);
                setModified((prevModified) => !prevModified);
            } else {
                // Some updates failed, handle the error
                console.error("One or more updates failed");
            }
        } catch (error) {
            // Handle any errors that occurred during the requests
            console.error("Error updating exercises:", error);
        } finally {
            setModalButtonLoadingState(false);
            setApproving(false);
        }
    };

    const openBatchApproveConfirmation = (approving: boolean = false) => {
        if (approving) {
            setApproving(true);
            setBatchOpTitle(
                "Are you sure you want to approve this batch of exercises?"
            );
        } else {
            setApproving(false);
            setBatchOpTitle(
                "Are you sure you want to unapprove this batch of exercises?"
            );
        }
        setBatchApprovalPressed(true);
    };

    const closeBatchApproveConfirmation = () => {
        setBatchApprovalPressed(false);
    };

    const columns = useMemo<ColumnDef<ExerciseTemplate>[]>(
        () => [
            {
                accessorKey: "checkbox",
                // header: () => (
                //     <input
                //         type="checkbox"
                //         onChange={(event) => {
                //             if (event.target.checked) {
                //                 setSelectedRows((prevSelectedRows) => [
                //                     ...prevSelectedRows,
                //                     ...rows.map((row) => row.original),
                //                 ]);
                //                 event.target.checked = true;
                //             } else {
                //                 setSelectedRows((prevSelectedRows) => []);
                //                 event.target.checked = false;
                //             }
                //         }}
                //     />
                // ),
                header: "",
                cell: (info) => (
                    <div className="w-10 h-10 flex items-center justify-center">
                        <input
                            type="checkbox"
                            checked={selectedRows.find(
                                (u) => u.id === info.row.original.id
                            )}
                            onChange={(event) => {
                                if (event.target.checked) {
                                    setSelectedRows((prevSelectedRows) => [
                                        ...prevSelectedRows,
                                        info.row.original,
                                    ]);
                                } else {
                                    setSelectedRows((prevSelectedRows) => {
                                        return prevSelectedRows.filter(
                                            (row) =>
                                                row.id !== info.row.original.id
                                        );
                                    });
                                }
                            }}
                        />
                    </div>
                ),
                size: 50,
                enableSorting: false,
            },
            {
                accessorKey: "motion",
                cell: (info) => info.getValue(),
                header: "Motion",
                size: 200,
                filterFn: "includesString",
            },
            {
                accessorFn: (row) => row.targetArea,
                accessorKey: "targetArea",
                id: "targetArea",
                cell: (info) => info.getValue(),
                header: "Target Area",
                size: 250,
            },
            {
                accessorKey: "fullName",
                header: "Exercise Name",
                size: 300,
                cell: (info) => (
                    <div
                        className={`px-4 py-2 font-semibold underline cursor-pointer"
                        }`}
                        onClick={() => {
                            alert(
                                `clicked ${JSON.stringify(info.row.original)}`
                            );
                            // handleApprovalClick(info.row.original)
                        }}
                    >
                        {info.getValue() as string}
                    </div>
                ),
            },
            {
                accessorKey: "shortName",
                header: "Shortened Name",
                size: 250,
            },
            // {
            //     accessorKey: "approved",
            //     header: "Approval Status",
            //     size: 180,
            //     cell: (info) => (
            //         <div>{info.getValue() ? "Approved" : "Unapproved"}</div>
            //     ),
            // },
            {
                accessorKey: "approved",
                header: "Approval Status",
                size: 180,
                cell: (info) => (
                    <div className="flex items-center">
                        {trainerDetails?.team.name === "Admins" ? (
                            <select
                                value={info.getValue() ? "true" : "false"}
                                onChange={(e) =>
                                    handleApprovalStatusChange(
                                        info.row.original,
                                        e.target.value === "true"
                                    )
                                }
                                className={`px-4 py-2 rounded-md bg-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    info.getValue()
                                        ? "bg-green-200"
                                        : "bg-red-200"
                                }`}
                            >
                                <option value="true">Approved</option>
                                <option value="false">Unapproved</option>
                            </select>
                        ) : info.getValue() ? (
                            "Approved"
                        ) : (
                            "Not Approved"
                        )}
                    </div>
                ),
            },
        ],
        [trainerDetails, rows, selectedRows]
    );

    const handleToastClose = () => {
        setShowToast(false);
    };

    async function fetchData(
        start: number,
        size: number,
        sorting: SortingState
    ) {
        const pageNo = start / size + 1;
        const url = new URL(`${API_BASE_URL}/mvmt/v1/admin/exercises`);
        url.searchParams.set("limit", size.toString());
        url.searchParams.set("pageNo", pageNo.toString());

        if (sorting.length) {
            const sort = sorting[0] as ColumnSort;
            const { id, desc } = sort;
            url.searchParams.set("sort_by", id);
            url.searchParams.set("sort_order", desc ? "desc" : "asc");
        }

        if (globalFilter) {
            url.searchParams.set("search_query", globalFilter);
        }

        const response = await axios.get(url.toString(), {
            withCredentials: true,
        });

        const { data, total } = response.data;

        return {
            data: data,
            meta: {
                totalRowCount: total,
            },
        };
    }

    const rightModal = () => {
        return (
            <RightModal
                formTitle="Add Exercise"
                isVisible={showRightModal}
                hideModal={() => {
                    setShowRightModal(false);
                }}
            >
                <AddExerciseForm
                    fetchData={() => {
                        setAdded((prevAdded) => !prevAdded);
                    }}
                    team={trainerDetails?.team.name}
                />
            </RightModal>
        );
    };

    if (!trainerDetails) {
        return null;
    }

    return (
        <main className="flex flex-col bg-transparent text-black">
            <div className="w-full flex flex-col gap-4 h-full">
                <div className="w-full flex flex-row items-center justify-between py-2 border-b-[1px] border-gray-200">
                    <div className="flex flex-row gap-2 items-center">
                        <span className="text-lg font-bold">Exercise List</span>
                        {isFetching && <LoadingSpinner className="h-4 w-4" />}
                    </div>
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded-md"
                        onClick={() => {
                            setSelectedRows((prevSelectedRows) => {
                                const newSelectedRows = Array.from(
                                    new Set([
                                        ...prevSelectedRows,
                                        ...rows.map((row) => row.original),
                                    ])
                                );
                                return newSelectedRows;
                            });
                        }}
                    >
                        Select All
                    </button>
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded-md"
                        onClick={() => {
                            setSelectedRows([]);
                        }}
                    >
                        Deselect All
                    </button>
                    <button
                        className="bg-red-500 disabled:bg-gray-600 text-white px-4 py-2 rounded-md"
                        disabled={selectedRows.length === 0}
                        onClick={openDeleteConfirmation}
                    >
                        Delete selected
                    </button>
                    <button
                        className="bg-green-500 disabled:bg-gray-600 text-white px-4 py-2 rounded-md"
                        disabled={selectedRows.length === 0}
                        onClick={() => {
                            openBatchApproveConfirmation(true);
                        }}
                    >
                        Approve selected
                    </button>
                    <button
                        className="bg-gold-500 disabled:bg-gray-600 text-white px-4 py-2 rounded-md"
                        disabled={selectedRows.length === 0}
                        onClick={() => {
                            openBatchApproveConfirmation(false);
                        }}
                    >
                        Unapprove selected
                    </button>
                    <TableActions
                        columns={columns}
                        selectedRows={selectedRows}
                        tableSearchQuery={globalFilter}
                        setTableSearchQuery={setGlobalFilter}
                        onClickNewButton={() => {
                            setShowRightModal(true);
                        }}
                    />
                </div>
                <div className="">
                    <QueryClientProvider client={queryClient}>
                        <ScrollTable
                            setRows={setRows}
                            queryKey="exercises"
                            columns={columns}
                            fetchData={fetchData}
                            dataAdded={added}
                            dataModified={modified}
                            globalFilter={globalFilter}
                            setGlobalFilter={setGlobalFilter}
                            setIsFetching={setIsFetching}
                        />
                    </QueryClientProvider>
                </div>
                {rightModal()}
                {deletePressed && (
                    <DeleteConfirmationDialog
                        title="this batch of exercises"
                        confirmDelete={handleBatchDelete}
                        cancelDelete={handleDeleteCancel}
                    />
                )}
                {batchApprovalPressed && (
                    <BatchConfirmationDialog
                        title={batchOpTitle}
                        confirmOp={handleBatchApproval}
                        cancelOp={closeBatchApproveConfirmation}
                        loadingState={modalButtonLoadingState}
                    />
                )}
                {showToast && (
                    <Toast
                        message={toastMessage}
                        onClose={handleToastClose}
                        type={toastType}
                    />
                )}
            </div>
        </main>
    );
};

export default ExercisePage;
